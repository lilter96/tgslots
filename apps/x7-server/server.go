package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

const initialBalance int64 = 1_000_000
const maxSessions = 5000

type cached struct {
	fingerprint string
	response    []byte
}
type pending struct {
	command     Command
	fingerprint string
	cost        int64
}
type Session struct {
	mu       sync.Mutex
	id       string
	state    State
	balance  int64
	revision uint64
	touched  time.Time
	cache    map[string]cached
	order    []string
	pending  *pending
}
type Server struct {
	mu       sync.Mutex
	sessions map[string]*Session
	math     MathClient
	timeout  time.Duration
}

func NewServer(math MathClient) *Server {
	return &Server{sessions: make(map[string]*Session), math: math, timeout: 8 * time.Second}
}
func (s *Server) session(id string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for key, entry := range s.sessions {
		if entry.mu.TryLock() {
			if now.Sub(entry.touched) > time.Hour {
				delete(s.sessions, key)
			}
			entry.mu.Unlock()
		}
	}
	if id != "" {
		entry := s.sessions[id]
		if entry == nil {
			return nil, errors.New("Session expired; reload to start a new demo")
		}
		return entry, nil
	}
	if len(s.sessions) >= maxSessions {
		return nil, errors.New("Demo session capacity reached")
	}
	entry := &Session{id: rand.Text(), state: initialState(), balance: initialBalance, touched: now, cache: make(map[string]cached)}
	s.sessions[entry.id] = entry
	return entry, nil
}
func fail(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
func send(w http.ResponseWriter, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(body)
}
func snapshot(entry *Session, result json.RawMessage) []byte {
	body, _ := json.Marshal(Response{SessionID: entry.id, Balance: entry.balance, Revision: entry.revision, State: entry.state, Result: result})
	return body
}
func (s *Server) commit(ctx context.Context, entry *Session) ([]byte, int, error) {
	operation := entry.pending
	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()
	reply, err := s.math.Call(rpcCtx, operation.command)
	if err != nil {
		return nil, 503, errors.New("Math service unavailable; retry the same request")
	}
	if reply.Error != "" {
		entry.pending = nil
		return nil, 400, errors.New(reply.Error)
	}
	var result struct {
		Win int64 `json:"win"`
	}
	if reply.State == nil || len(reply.Result) == 0 || json.Unmarshal(reply.Result, &result) != nil ||
		result.Win < 0 || result.Win > baseCost*maxWinX*operation.command.Multiplier || !validState(*reply.State) ||
		reply.Version != 1 || reply.RequestID != operation.command.RequestID {
		return nil, 502, errors.New("Invalid math response; operation remains pending")
	}
	entry.balance = entry.balance - operation.cost + result.Win
	entry.state = *reply.State
	entry.revision++
	response := snapshot(entry, reply.Result)
	entry.cache[operation.command.RequestID] = cached{operation.fingerprint, response}
	entry.order = append(entry.order, operation.command.RequestID)
	if len(entry.order) > 256 {
		delete(entry.cache, entry.order[0])
		entry.order = entry.order[1:]
	}
	entry.pending = nil
	return response, 200, nil
}
func validState(state State) bool {
	if state.TriggeringMultiplier < 1 || state.TriggeringMultiplier > 10000 || state.RoundWin < 0 ||
		state.RoundWin > baseCost*maxWinX*state.TriggeringMultiplier || len(state.LastGrid) != 5 {
		return false
	}
	for _, column := range state.LastGrid {
		if len(column) != 3 {
			return false
		}
		for _, symbol := range column {
			if symbol < 0 || symbol > 6 {
				return false
			}
		}
	}
	if state.Phase == "BASE" {
		return state.Bonus == nil
	}
	if state.Phase != "HOLD" && state.Phase != "BOOST" || state.Bonus == nil {
		return false
	}
	bonus := state.Bonus
	if bonus.Respins < 0 || bonus.Respins > 3 || len(bonus.Coins) > 15 {
		return false
	}
	seen := make(map[int]bool)
	for _, coin := range bonus.Coins {
		if coin.Position < 0 || coin.Position >= 15 || coin.Value <= 0 || seen[coin.Position] {
			return false
		}
		seen[coin.Position] = true
	}
	return true
}
func fingerprint(action string, request Request) string {
	bytes, _ := json.Marshal(struct {
		Action     string
		Multiplier int64
		Revision   *uint64
	}{action, request.Payload.Multiplier, request.ExpectedRevision})
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:])
}
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/health" {
		if r.Method != "GET" {
			fail(w, 405, "GET required")
			return
		}
		if broker, ok := s.math.(interface{ Ready() error }); ok {
			if err := broker.Ready(); err != nil {
				fail(w, 503, err.Error())
				return
			}
		}
		send(w, []byte(`{"status":"ok","game":"x7-club"}`))
		return
	}
	if r.Method != "POST" {
		fail(w, 405, "POST required")
		return
	}
	action := strings.TrimPrefix(r.URL.Path, "/game/x7-club/")
	if action == r.URL.Path || !strings.Contains("|state|spin|buybonus|next|", "|"+action+"|") {
		fail(w, 404, "Unknown game action")
		return
	}
	var request Request
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16384))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		fail(w, 400, "Invalid request JSON")
		return
	}
	if err := decoder.Decode(new(json.RawMessage)); err != io.EOF {
		fail(w, 400, "One JSON object required")
		return
	}
	if action != "state" && request.SessionID == "" {
		fail(w, 400, "Create a session with state first")
		return
	}
	entry, err := s.session(request.SessionID)
	if err != nil {
		fail(w, 404, err.Error())
		return
	}
	entry.mu.Lock()
	defer entry.mu.Unlock()
	entry.touched = time.Now()
	if action == "state" {
		if entry.pending != nil {
			_, status, err := s.commit(r.Context(), entry)
			if err != nil {
				fail(w, status, err.Error())
				return
			}
		}
		send(w, snapshot(entry, nil))
		return
	}
	if len(request.RequestID) < 8 || len(request.RequestID) > 128 || request.ExpectedRevision == nil {
		fail(w, 400, "requestId and expectedRevision are required")
		return
	}
	key := fingerprint(action, request)
	if previous, exists := entry.cache[request.RequestID]; exists {
		if previous.fingerprint != key {
			fail(w, 409, "requestId was already used for another command")
			return
		}
		send(w, previous.response)
		return
	}
	if entry.pending != nil {
		if entry.pending.command.RequestID != request.RequestID || entry.pending.fingerprint != key {
			fail(w, 409, "Resolve the pending request before another action")
			return
		}
	} else {
		if *request.ExpectedRevision != entry.revision {
			fail(w, 409, "Stale revision; refresh state")
			return
		}
		if action == "next" && entry.state.Phase == "BASE" {
			fail(w, 400, "No active bonus")
			return
		}
		if action != "next" && entry.state.Phase != "BASE" {
			fail(w, 400, "Finish the active bonus first")
			return
		}
		multiplier := request.Payload.Multiplier
		cost := int64(0)
		if action == "next" {
			multiplier = entry.state.TriggeringMultiplier
		} else {
			if multiplier < 1 || multiplier > 10000 {
				fail(w, 400, "Multiplier must be 1..10000")
				return
			}
			cost = baseCost * multiplier
			if action == "buybonus" {
				cost *= buyCost
			}
		}
		if cost > entry.balance {
			fail(w, 400, "Insufficient demo credits")
			return
		}
		seedBytes := make([]byte, 4)
		if _, err := rand.Read(seedBytes); err != nil {
			fail(w, 500, "Seed generation failed")
			return
		}
		entry.pending = &pending{Command{Version: 1, RequestID: request.RequestID, Action: action, Multiplier: multiplier, Seed: binary.LittleEndian.Uint32(seedBytes), State: entry.state}, key, cost}
	}
	body, status, err := s.commit(r.Context(), entry)
	if err != nil {
		fail(w, status, err.Error())
		return
	}
	send(w, body)
}

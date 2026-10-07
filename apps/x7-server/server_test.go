package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

type fakeMath struct {
	mu       sync.Mutex
	calls    []Command
	failures int
	invalid  bool
}

func (f *fakeMath) Call(_ context.Context, command Command) (Reply, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, command)
	if f.failures > 0 {
		f.failures--
		return Reply{}, errors.New("lost reply")
	}
	state := command.State
	state.Phase = "BASE"
	state.Bonus = nil
	state.TriggeringMultiplier = command.Multiplier
	state.RoundWin = 5
	if command.Action == "next" {
		state.RoundWin = command.State.RoundWin + 5
	}
	if f.invalid {
		state.LastGrid = nil
	}
	return Reply{Version: 1, RequestID: command.RequestID, State: &state, Result: json.RawMessage(`{"type":"BASE","win":5}`)}, nil
}
func call(t *testing.T, s *Server, action, body string) (int, []byte) {
	t.Helper()
	recorder := httptest.NewRecorder()
	s.ServeHTTP(recorder, httptest.NewRequest("POST", "/game/x7-club/"+action, strings.NewReader(body)))
	return recorder.Code, recorder.Body.Bytes()
}
func create(t *testing.T, s *Server) Response {
	t.Helper()
	status, body := call(t, s, "state", `{"payload":{}}`)
	if status != 200 {
		t.Fatalf("create: %d %s", status, body)
	}
	var response Response
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatal(err)
	}
	return response
}
func request(id, key string, revision uint64, multiplier int) string {
	return fmt.Sprintf(`{"sessionId":%q,"requestId":%q,"expectedRevision":%d,"payload":{"multiplier":%d}}`, id, key, revision, multiplier)
}
func TestDuplicateRequestPaysAndChargesOnce(t *testing.T) {
	math := &fakeMath{}
	s := NewServer(math)
	session := create(t, s)
	body := request(session.SessionID, "duplicate-0001", 0, 2)
	status, first := call(t, s, "spin", body)
	if status != 200 {
		t.Fatal(status, string(first))
	}
	status, second := call(t, s, "spin", body)
	if status != 200 || string(first) != string(second) {
		t.Fatal("duplicate response differs")
	}
	if len(math.calls) != 1 {
		t.Fatal("duplicate executed twice")
	}
	var response Response
	_ = json.Unmarshal(second, &response)
	if response.Balance != initialBalance-40+5 || response.Revision != 1 {
		t.Fatal("wallet applied twice")
	}
	status, _ = call(t, s, "spin", request(session.SessionID, "duplicate-0001", 0, 3))
	if status != 409 {
		t.Fatal("reused key with a different body accepted")
	}
}
func TestConcurrentDuplicateRequestsSerialize(t *testing.T) {
	math := &fakeMath{}
	s := NewServer(math)
	session := create(t, s)
	body := request(session.SessionID, "parallel-0001", 0, 1)
	var group sync.WaitGroup
	codes := make(chan int, 20)
	for i := 0; i < 20; i++ {
		group.Add(1)
		go func() { defer group.Done(); code, _ := call(t, s, "spin", body); codes <- code }()
	}
	group.Wait()
	close(codes)
	for code := range codes {
		if code != 200 {
			t.Fatalf("status %d", code)
		}
	}
	if len(math.calls) != 1 {
		t.Fatal("concurrent requests executed twice")
	}
}
func TestLostReplyPreservesSeedAndBlocksOtherActions(t *testing.T) {
	math := &fakeMath{failures: 1}
	s := NewServer(math)
	session := create(t, s)
	body := request(session.SessionID, "lost-reply-01", 0, 2)
	status, _ := call(t, s, "spin", body)
	if status != 503 {
		t.Fatal(status)
	}
	status, _ = call(t, s, "spin", request(session.SessionID, "different-01", 0, 2))
	if status != 409 {
		t.Fatal("pending operation replaced")
	}
	if s.sessions[session.SessionID].balance != initialBalance {
		t.Fatal("timeout charged wallet")
	}
	status, reply := call(t, s, "spin", body)
	if status != 200 {
		t.Fatal(status, string(reply))
	}
	if len(math.calls) != 2 || math.calls[0].Seed != math.calls[1].Seed || math.calls[0].RequestID != math.calls[1].RequestID {
		t.Fatal("retry changed seeded command")
	}
	if s.sessions[session.SessionID].balance != initialBalance-40+5 {
		t.Fatal("wrong retry wallet")
	}
}
func TestStateReadResolvesPendingOperation(t *testing.T) {
	math := &fakeMath{failures: 1}
	s := NewServer(math)
	session := create(t, s)
	body := request(session.SessionID, "pending-state", 0, 1)
	call(t, s, "spin", body)
	status, reply := call(t, s, "state", fmt.Sprintf(`{"sessionId":%q,"payload":{}}`, session.SessionID))
	if status != 200 {
		t.Fatal(status, string(reply))
	}
	var response Response
	_ = json.Unmarshal(reply, &response)
	if response.Revision != 1 || response.Balance != initialBalance-20+5 {
		t.Fatal("pending operation not committed")
	}
	call(t, s, "spin", body)
	if len(math.calls) != 2 {
		t.Fatal("recovery and retry executed extra command")
	}
}
func TestEvictedReplayCannotRunAtStaleRevision(t *testing.T) {
	math := &fakeMath{}
	s := NewServer(math)
	session := create(t, s)
	for i := 0; i < 258; i++ {
		status, reply := call(t, s, "spin", request(session.SessionID, fmt.Sprintf("operation-%04d", i), uint64(i), 1))
		if status != 200 {
			t.Fatal(status, string(reply))
		}
	}
	status, _ := call(t, s, "spin", request(session.SessionID, "operation-0000", 0, 1))
	if status != 409 || len(math.calls) != 258 {
		t.Fatal("evicted key reexecuted")
	}
}
func TestInvalidInputAndMathRepliesDoNotChangeWallet(t *testing.T) {
	math := &fakeMath{invalid: true}
	s := NewServer(math)
	session := create(t, s)
	for _, body := range []string{
		request(session.SessionID, "invalid-0001", 0, 0), request(session.SessionID, "invalid-0001", 0, 10001),
		`{"payload":{"multiplier":1.5}}`, `{"balance":999,"payload":{}}`,
		fmt.Sprintf(`{"sessionId":%q,"payload":{"multiplier":1}}`, session.SessionID),
	} {
		status, _ := call(t, s, "spin", body)
		if status != 400 {
			t.Fatal("invalid request accepted", body, status)
		}
	}
	status, _ := call(t, s, "spin", request(session.SessionID, "invalid-math", 0, 1))
	if status != 502 || s.sessions[session.SessionID].balance != initialBalance {
		t.Fatal("invalid math changed wallet")
	}
}
func TestBonusMustFinishBeforeAnotherPaidSpin(t *testing.T) {
	s := NewServer(&fakeMath{})
	session := create(t, s)
	entry := s.sessions[session.SessionID]
	entry.state.Phase = "HOLD"
	entry.state.Bonus = &Bonus{Respins: 3, Coins: []Coin{{Position: 0, Value: 20, Tier: "CREDIT"}}}
	status, _ := call(t, s, "spin", request(session.SessionID, "bonus-active", 0, 1))
	if status != 400 {
		t.Fatal(status)
	}
	status, _ = call(t, s, "next", request(session.SessionID, "bonus-next-1", 0, 9999))
	if status != 200 || entry.balance != initialBalance+5 {
		t.Fatal("bonus charged stake")
	}
}

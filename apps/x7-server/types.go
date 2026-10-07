package main

import "encoding/json"

type Coin struct {
	Position int    `json:"position"`
	Value    int64  `json:"value"`
	Tier     string `json:"tier"`
}
type Bonus struct {
	Coins          []Coin `json:"coins"`
	Respins        int    `json:"respins"`
	BoostedColumns []int  `json:"boostedColumns"`
	PendingColumns []int  `json:"pendingColumns"`
	BoostPulls     int    `json:"boostPulls"`
}
type State struct {
	Phase                string  `json:"phase"`
	TriggeringMultiplier int64   `json:"triggeringMultiplier"`
	RoundWin             int64   `json:"roundWin"`
	Bonus                *Bonus  `json:"bonus"`
	LastGrid             [][]int `json:"lastGrid"`
}
type Command struct {
	Version    int    `json:"version"`
	RequestID  string `json:"requestId"`
	Action     string `json:"action"`
	Multiplier int64  `json:"multiplier"`
	Seed       uint32 `json:"seed"`
	State      State  `json:"state"`
}
type Reply struct {
	Version   int             `json:"version"`
	RequestID string          `json:"requestId"`
	State     *State          `json:"state,omitempty"`
	Result    json.RawMessage `json:"result,omitempty"`
	Error     string          `json:"error,omitempty"`
}
type Response struct {
	SessionID string          `json:"sessionId"`
	Balance   int64           `json:"balance"`
	Revision  uint64          `json:"revision"`
	State     State           `json:"state"`
	Result    json.RawMessage `json:"result,omitempty"`
}
type Request struct {
	SessionID        string  `json:"sessionId"`
	RequestID        string  `json:"requestId"`
	ExpectedRevision *uint64 `json:"expectedRevision"`
	Payload          struct {
		Multiplier int64 `json:"multiplier"`
	} `json:"payload"`
}

func initialState() State {
	return State{Phase: "BASE", TriggeringMultiplier: 1,
		LastGrid: [][]int{{0, 1, 2}, {0, 1, 2}, {0, 1, 2}, {0, 1, 2}, {0, 1, 2}}}
}

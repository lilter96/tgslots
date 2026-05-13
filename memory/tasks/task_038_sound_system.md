---
title: "Task 038: Implement Sound System in Slot Engine"
status: "completed"
task_id: "task_038"
component: "web-client"
tags: ["feature", "audio", "web-client"]
---

# Task 038: Implement Sound System in Slot Engine

Upgrade the slot engine to support sounds and music, following modern architectural patterns.

## Objectives
- [x] Create `SoundManager` in `engine/` for audio playback and control.
- [x] Update `AssetRegistry` to support loading audio assets via `@pixi/sound`.
- [x] Inject `SoundManager` into `GameUIContext`.
- [x] Update `HUD` to include a Mute/Unmute control.
- [x] Integrate sound triggers into `SpinOrchestrator` via events.
- [x] Implement sample sounds in Woodland Whisper to verify functionality.

## Work Completed
- **Asset Sourcing**: Downloaded 5 high-quality CC0 MP3 assets (BGM, Spin Start, Reel Stop, Win Small, Win Big) into `apps/web-client/public/assets/sounds/woodland-whisper/`.
- **Sound Manager**: Implemented `SoundManager` with separate volume controls for BGM and SFX, cross-fade support, and implicit event-to-sound mapping.
- **Engine Updates**: 
    - Updated `AssetRegistry` to handle `audio` manifest entries.
    - Enhanced `GameEventBus` with audio-specific events.
    - Added a Mute button to the `HUD` with persistence in `localStorage`.
- **Game Integration**: Configured `WoodlandWhisper` to use the new sound system via `IGameClient.soundMapping` and event emissions in `WoodlandWhisperRuntime`.

## Verification
- `bun run build` passed across the monorepo.
- Sound settings persist in `localStorage`.
- Events are correctly mapped to audio assets.

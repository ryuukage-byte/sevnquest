// ==============================================================================
// NIHONGO TOWER — UNIFIED ENGINE EXPORTS
// ==============================================================================

// 1. Core Types & Progression Models
export * from '../../types/tower';

// 2. Procedural & Mastery Engines (Stages 1-2)
export * from './masteryEngine';
export * from './floorGenerator';

// 3. Round Orchestration & State Machine (Stage 3 & 4)
export * from './round/roundState';
export * from './round/roundResolver';
export * from './round/roundDifficulty';
export * from './round/roundOrchestrator';

// 4. Combat, Economy & Persistence Systems (Stage 3, 4 & 5)
export * from './combat/hpSystem';
export * from './combat/rewardEngine';
export * from './combat/checkpoint';
export * from './combat/bossGate';
export * from './combat/skillTree';

// 5. Engine Adapters (Stage 3)
export * from './adapters/canvasAdapter';
export * from './adapters/quizAdapter';
export * from './adapters/conjugationAdapter';

// 6. World Building & Narrative Layer (Stage 5)
export * from './world/towerRegions';
export * from './world/floorNarrative';
export * from './world/towerAchievements';
export * from './world/towerProgress';

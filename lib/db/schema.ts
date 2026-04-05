import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const analyses = sqliteTable('analyses', {
  id: text('id').primaryKey().notNull(),
  scenario_id: text('scenario_id').notNull(),
  items: text('items', { mode: 'json' }).notNull().default('[]'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => {
  return {
    scenarioIdIdx: index('scenario_id_idx').on(table.scenario_id),
  }
});

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey().notNull(),
  email: text('email'),
  full_name: text('full_name'),
  avatar_url: text('avatar_url'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  settings: text('settings', { mode: 'json' }).default('{}'),
});

export const progress_stats = sqliteTable('progress_stats', {
  id: text('id').primaryKey().notNull(),
  user_id: text('user_id').notNull(),
  date: text('date').notNull(),
  scenarios_count: integer('scenarios_count').default(0),
  vocabulary_added: integer('vocabulary_added').default(0),
  vocabulary_reviewed: integer('vocabulary_reviewed').default(0),
  total_study_time: integer('total_study_time').default(0),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => {
  return {
    userIdIdx: index('ps_user_id_idx').on(table.user_id),
  }
});

export const scenarios = sqliteTable('scenarios', {
  id: text('id').primaryKey().notNull(),
  user_id: text('user_id').notNull(),
  title: text('title').notNull(),
  audio_url: text('audio_url'), // Made optional for text/AI scenarios
  duration: integer('duration').notNull(),
  transcription: text('transcription'),
  language: text('language').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  metadata: text('metadata', { mode: 'json' }).default('{}'),
  status: text('status').notNull().default('new'),
}, (table) => {
  return {
    userIdIdx: index('scenarios_user_id_idx').on(table.user_id),
  }
});

export const userSettings = sqliteTable('user_settings', {
  user_id: text('user_id').primaryKey().notNull(),
  daily_vocabulary_goal: integer('daily_vocabulary_goal'),
  total_vocabulary_goal: integer('total_vocabulary_goal').default(150),
  notification_preferences: text('notification_preferences', { mode: 'json' }).default('{}'),
  theme: text('theme').default('light'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  source_languages: text('source_languages', { mode: 'json' }).$type<string[]>().default(['en']),
  target_language: text('target_language').default('da'),
});

export const vocabulary = sqliteTable('vocabulary', {
  id: text('id').primaryKey().notNull(),
  user_id: text('user_id').notNull(),
  scenario_id: text('scenario_id'), // Linked to the source scenario
  word: text('word').notNull(),
  translation: text('translation').notNull(),
  language: text('language').notNull(),
  context: text('context'),
  example_sentence: text('example_sentence'),
  difficulty_level: integer('difficulty_level'),
  last_reviewed: text('last_reviewed'),
  next_review: text('next_review'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  metadata: text('metadata', { mode: 'json' }).default('{}'),
  target_language: text('target_language').notNull().default('da'),
  // SRS (SM-2) fields
  ease_factor: text('ease_factor').notNull().default('2.5'), // stored as text for SQLite real compatibility
  interval: integer('interval').notNull().default(0), // days until next review
  repetition_count: integer('repetition_count').notNull().default(0), // consecutive correct answers
  srs_level: text('srs_level').notNull().default('new'), // new | learning | young | mature
}, (table) => {
  return {
    userIdIdx: index('vocab_user_id_idx').on(table.user_id),
    scenarioIdIdx: index('vocab_scenario_id_idx').on(table.scenario_id),
  }
});

export const vocabularyReviews = sqliteTable('vocabulary_reviews', {
  id: text('id').primaryKey().notNull(),
  user_id: text('user_id').notNull(),
  vocabulary_id: text('vocabulary_id').notNull(),
  review_date: text('review_date').notNull(),
  success: integer('success', { mode: 'boolean' }).notNull(),
  difficulty_rating: integer('difficulty_rating'),
  notes: text('notes'),
  created_at: text('created_at').notNull(),
}, (table) => {
  return {
    userIdIdx: index('vr_user_id_idx').on(table.user_id),
  }
});

export const signup_requests = sqliteTable('signup_requests', {
  id: text('id').primaryKey().notNull(),
  email: text('email').notNull(),
  status: text('status').notNull().default('pending'),
  created_at: text('created_at').notNull(),
});

export const tts_cache = sqliteTable('tts_cache', {
  id: text('id').primaryKey().notNull(), // Hash of text + language + voice
  text: text('text').notNull(),
  language: text('language').notNull(),
  voice_name: text('voice_name').notNull(),
  audio_base64: text('audio_base64').notNull(),
  mime_type: text('mime_type').notNull(),
  created_at: text('created_at').notNull(),
}, (table) => {
  return {
    textIdx: index('tts_text_idx').on(table.text),
  }
});

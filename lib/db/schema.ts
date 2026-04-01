import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const analyses = sqliteTable('analyses', {
  id: text('id').primaryKey().notNull(),
  recording_id: text('recording_id').notNull(),
  items: text('items', { mode: 'json' }).notNull().default('[]'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
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
  recordings_count: integer('recordings_count').default(0),
  vocabulary_added: integer('vocabulary_added').default(0),
  vocabulary_reviewed: integer('vocabulary_reviewed').default(0),
  total_study_time: integer('total_study_time').default(0),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const recordings = sqliteTable('recordings', {
  id: text('id').primaryKey().notNull(),
  user_id: text('user_id').notNull(),
  title: text('title').notNull(),
  audio_url: text('audio_url').notNull(),
  duration: integer('duration').notNull(),
  transcription: text('transcription'),
  language: text('language').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  metadata: text('metadata', { mode: 'json' }).default('{}'),
  status: text('status').notNull().default('new'),
});

export const userSettings = sqliteTable('user_settings', {
  user_id: text('user_id').primaryKey().notNull(),
  daily_vocabulary_goal: integer('daily_vocabulary_goal'),
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
});

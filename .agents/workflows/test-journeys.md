---
description: Test major user journeys for PhraseOS
---

This workflow defines the tests and steps to verify that the core user journeys in PhraseOS are fully functional.

## Prerequisites
- Ensure the dev server is running (`npm run dev`).
- Make sure to have valid environment variables in `.env.local` for Supabase and Gemini/OpenAI.

## Journey 1: Authentication & Navigation
// turbo
1. **Navigate to Landing Page**: `http://localhost:3000/`.
2. **Click "Get Started"**: Verify it redirects to `/auth/signup`.
3. **Login Test**: 
   - Navigate to `/auth/login`.
   - Fill in user credentials.
   - Click "Sign In".
   - Verify redirection to `/dashboard/record`.
4. **Sidebar Navigation**:
   - Click on "Recordings", "Vocabulary", "Progress", and "Settings".
   - Verify that each page loads correctly with its expected heading.

## Journey 2: Text Analysis (Pasted Content)
1. **Go to Record Page**: `/dashboard/record`.
2. **Switch to "Upload Text"**:
   - Click on the "Upload Text" accordion trigger.
3. **Paste & Analyze**:
   - Enter a sentence like "Jeg vil gerne have en kop kaffe" (Danish) into the textarea.
   - Click "Analyze Text".
   - Wait for the analysis loader to disappear.
4. **Verify Results**:
   - Confirm that the transcription shows the pasted text.
   - Confirm that the analysis results appear under "Review New Vocabulary".
   - Toggle one or two checkboxes.
   - Click "Import Selected Items".
   - Verify "Vocabulary Imported" toast or updated "Imported Vocabulary" section.

## Journey 3: Audio Recording Simulation
> [!NOTE]
> Since real microphone access might be restricted in an automated environment, focus on the UI state transitions.
1. **Go to Record Page**: `/dashboard/record`.
2. **Start Recording**:
   - Click the microphone button.
   - Verify that the button switches to "Stop" (Square icon) and the timer starts ticking.
3. **Stop Recording**:
   - Click the "Stop" button.
   - Verify that "Processing recording...", "Transcribing audio...", and "Extracting vocabulary..." loaders appear.
4. **Verify Workflow Continuity**:
   - After transcription completes, confirm the "Transcription" section and the audio player (even if empty/mocked) are visible.

## Journey 4: Settings & Personalization
1. **Go to Settings**: `/dashboard/settings`.
2. **Change Target Language**: 
   - Select a different language (e.g., German).
   - Click "Save Changes".
   - Verify the "Settings saved" toast.
3. **Verify Persistence**:
   - Navigate back to `/dashboard/record` and confirm the target language badge matches the newly selected language.

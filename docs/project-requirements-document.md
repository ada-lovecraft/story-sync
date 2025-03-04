# Project Requirements Document

## 1. Introduction

The ChatLog Cleaner application is designed to process sizable text files (typically 1MB - 3MB) that represent chat logs from single-player roleplay conversations. The log files capture interactions between a user and an AI chatbot. The application uses a structured workflow to clean, format, parse, and organize the chat logs into meaningful components for further analysis and summarization.

## 2. Scope

This document outlines the requirements for the ChatLog Cleaner application, detailing its functional, non-functional, and UI requirements. It serves as a guide for developers, testers, and stakeholders to ensure that all features are implemented according to predefined expectations.

## 3. System Overview

The ChatLog Cleaner application is a workflow-based system built with Next.js and React, making use of shadcn UI components alongside Tailwind CSS for styling. The back-end is powered by a SQLite database using Drizzle ORM. The application leverages a series of sequential steps to manage file uploads, cleaning and formatting of chat logs, parsing conversation rounds, and chapter chunking with advanced data table handling.

## 4. Functional Requirements

### 4.1 File Upload/Selection

- **Upload Mechanism:**
  - Users must be able to upload chat log files using a drag-and-drop file drop zone.
  - The system should compute a file hash to generate a unique identifier for each file.
  - If a duplicate file is uploaded, the user is redirected to the previous workflow progress for that file.
- **Existing Documents:**
  - Display a table of previously uploaded files.
  - Allow users to select an existing document to proceed with the cleaning workflow.

### 4.2 Clean/Format Step

- **Content Transformation:**
  - Replace the first occurrence of the pattern /^You said:/ with `<user>` if the first occurence of the pattern occurs before the occurence of `chatGPT said:`.
  - Replace subsequent occurrences of /^You said:/ with `</dungeon_master>\n<user>`.
  - Replace all instances of `chatGPT said:` with `</user>\n<dungeon_master>`.
  - Ensure the file begins with `<user>` and ends with `</dungeon_master>`.
  - Remove all instances of the lines that begin with /\d+\/\d+/ and contain no other content
  - Replace multiple consecutive newline sequences (\n\n\n*) with a single double newline (\n\n).
  - All pattern matching should be case insensitive.

- **Display Requirements:**
  - Before-and-after statistics including number of lines and file size.
  - A side-by-side comparison view of the original and cleaned content, with synchronized scrolling.

### 4.3 Parse Rounds

- **Definition of a Round:**
  - A round consists of a pair of nodes: a `<user>` node followed directly by a `<dungeon_master>` node.
- **Data Extraction:**
  - Extract and store metadata such as round number, start and end line numbers, total lines, and character count.
  - Do not store the full content of each round in the database; the content should be referenceable via file range offsets.
- **Display Statistics:**
  - Show statistics including total number of rounds and average lines per round.

### 4.4 Chapter Chunking / Data Table Refactoring

- **Chapter Formation:**
  - Organize rounds into chapters based on a target line count per chapter. The chapter must include at least the target number of lines without splitting rounds unnecessarily.
- **Refactored Data Table Requirements:**
  - The current nested table structure is to be replaced with separate, clearer tables for each chapter.
  - Use an accordion or card-based layout to group chapters.
  - Each chapter will display key metrics such as chapter number, total rounds, and total lines.

- **Round Actions and Controls:**
  - Provide functionality to manage rounds within chapters:
    - Slide Up: Slice the rounds in the containing chapter at this round's index  and append to previous chapter (disabled for first chapter).
    - Slide Up: Slice the rounds in the containing chapter at this round's index  and prepend to next chapter (disabled for last chapter).
    - Split: Slice the rounds in the containing chapter and insert a new chapter in the chapterlist just after the parent chapter.
    - Context Down: aggregate this content of this and subsequent rounds in this chapter, and provide it as context to the next chapter.
    - Omit: Mark rounds to be excluded from generative summarization (displayed as disabled rows).
    - ReRoll: Regenerate the narrative summary for a round and adjust its order in the processing queue.

- **Summarization State:**
  - Each `round` round should include a one-sentence narrative summary.
  - Rounds without summaries should enter a summarization queue with clear status indicators (e.g., queued, completed, error).
  - Round Summarization Queue should begin immediately when step data is acquired.
  - Summarization queue is on a per chapter basis. Each identified chapter will queue its own rounds for summarization.
  
## 5. Non-Functional Requirements

### 5.1 Performance

- The application should efficiently handle large text files (up to 3MB).
- The data table components, especially during chapter chunking, should perform smoothly with large datasets. Options such as virtualization (tanstack/react-virtual) should be considered.

### 5.2 Usability

- The workflow must be intuitive, with clear navigation between steps.
- The UI should consistently use shadcn components and Tailwind CSS for a coherent experience.
- Synchronous features such as side-by-side file comparisons should be implemented for enhanced user experience.

### 5.3 Scalability

- The architecture should allow easy addition of new workflow steps.
- Code separation into single responsibility components is essential to maintain clarity and ease of testing.

### 5.4 Maintainability

- Thorough inline documentation and code comments must be maintained.
- The code should follow a modular design, enabling future refactoring with minimal risk.

## 6. Use Cases

### 6.1 Upload and Process a Chat Log File

1. The user uploads a chat log file using the file drop zone.
2. The system calculates the file hash and checks for duplicates.
3. If the file is new, it is added to the repository; otherwise, the workflow resumes from the previous state.
4. The file enters the clean/format step, where the text is transformed according to predefined patterns.

### 6.2 Parse and Organize Conversation Rounds

1. The cleaned file is parsed to identify individual conversation rounds (user and dungeon master pairs).
2. Rounds are stored with metadata (e.g., round number, line count, offsets).
3. Summarization statuses are updated based on the completeness of narrative summaries.

### 6.3 Chapter Chunking and Data Table Interaction

1. Based on a predefined target line count (2500) based on a LEAST_GREATER_THAN strategu, rounds are aggregated into chapters.
2. A clean, fullscreen, UI is presented, using clean card-based step displays.
3. Users can perform actions on rounds such as sliding rounds between chapters, omitting rounds, or re-rolling summaries.

## 7. UI and Interface Requirements

- **General UI:**
  - A modern, responsive UI that leverages shadcn components and Tailwind CSS definitions.
  - Sidebar, navbar, theme selector, default dark theme.
  - Full Width of the viewport. Stretch to fill
  - Use ScrollAreas instead of allowing the whole page to scroll.
  - monochrome (status indicators are the exception)
  - use Subtle typography shifts (font weight, font-family) to provide visual contrast.
  - No more than 4 different shades of black, white, and gray.
  - Visually significant use of monospaced, sanserif, and serif fonts.
  -

- **Workflow Navigation:**
  - Intuitive navigation between workflow steps (Upload/Select, Clean/Format, Parse Rounds, Chapter Chunking).
  
- **File Comparison View:**
  - A dual-pane side by side view during the cleaning step, with synchronized scrolling and side-by-side display of original and cleaned content.

- **Data Table for Chapters and Rounds:**
  - Clear separation of chapters and rounds via an accordion or card layout.
  - Dedicated tables for rounds within each chapter with action columns for each round.

### 7.1 Eager UI Updates for Workflow Steps

To enhance user experience and responsiveness, the ChatLog Cleaner application is designed to implement eager UI updates for each workflow step. By providing immediate feedback, the UI minimizes perceived latency and keeps the user engaged while backend processes complete asynchronously. Eager updates should be considered for the following workflow steps:

- **Upload/Select:**
  - As soon as a file is dropped or selected, the UI should immediately reflect a pending state.
  - The system should display an immediate acknowledgement (e.g., a loading spinner or visual confirmation) while the file's hash is being computed and duplicate checks are in progress.
  - Optimistic updates for file list views can be employed to show the new file before the entire upload process is confirmed.

- **Clean/Format:**
  - Upon initiating the cleaning process, the interface should immediately switch to a preview or processing state.
  - Side-by-side views of the original and cleaned text should update instantly, even if some details (like exact line counts or extensive diff comparisons) are refined asynchronously.
  - Visual indicators (e.g., progress bars or update notifications) should be used to communicate that cleaning is occurring in real-time.

- **Parse Rounds:**
  - As soon as the cleaning step is completed, the UI should eagerly display a preliminary parsing result.
  - Temporary placeholders or skeleton loaders can be used in the rounds summary while parsing metadata (such as round numbers and character counts) are finalized.
  - Updates regarding the number of rounds and computed statistics should appear immediately and be refined as more detailed processing completes.

- **Chapter Chunking / Data Table Interaction:**
  - When rounds are aggregated into chapters, the UI should immediately render chapter cards with basic statistics and available actions.
  - Any round-level actions (e.g., sliding, omitting, or re-rolling) should trigger immediate visual updates to the chapter card, with further backend updates processed asynchronously.
  - Real-time updates in the data table, such as changes in chapter metrics or round status, should occur optimistically to improve the flow and responsiveness of the interface.

By implementing eager UI updates, the application ensures smooth transitions and consistent user feedback across all workflow steps, ultimately enhancing the overall usability and performance perception of the ChatLog Cleaner application.

### 7.2 Chapter Table Layout

The chapter table in the ChatLog Cleaner application is designed as a card-based layout, implemented in the ChapterCard.tsx component. This layout provides a clear and concise overview of each chapter and its associated rounds, while supporting user interaction and advanced actions. The following describes its structure and functionality:

- **Card Container:**
  - Each chapter is represented as a card that uses Tailwind CSS for styling and shadcn UI components for consistency. The card provides a visual grouping of the chapter's content.
  
- **Header Section:**
  - **Expand/Collapse Button:** A toggle button (displaying either a ChevronDownIcon or ChevronUpIcon) allows users to expand or collapse the chapter to view its rounds. The button is accessible and provides appropriate aria-labels depending on its state.
  - **Chapter Title and Number:** The header displays the chapter number along with its title. This information is presented prominently, using typography that highlights the chapter identity.
  - **Chapter Statistics:**
    - A badge showing the number of rounds in the chapter.
    - A line count indicator that compares the actual line count of the rounds with the target line count (if specified in the chapter configuration).
    - Additional visual cues, such as ring highlights or shadows, may be applied if the chapter is highlighted or has a target line count mismatch.
  
- **Action Area:**
  - The header includes action buttons for chapter-level operations such as editing the chapter title and triggering summarization. These buttons are grouped and designed to be both intuitive and accessible.

- **Expandable Content:**
  - When expanded, the card reveals the rounds associated with the chapter. This content is rendered within an expandable area using the RoundsTable component.
  - The expandable section is animated with smooth transitions to improve user experience during expansion and collapse.
  - The rounds table provides detailed information for each round along with round-specific actions (e.g., slide up, slide down, re-roll, context down, omit, split).

- **Responsive Layout and Performance:**
  - The chapter table layout is optimized for performance through memoization (using React.memo) and efficient state management to reduce unnecessary re-renders.
  - The component layout is responsive, ensuring that chapter cards adjust their spacing and content alignment based on the viewport size.

- **Row and Chapter Animations:**
  - **Row Prepending:** When rounds are prepended to a chapter, they should animate with a slide-down motion in descending order (from top to bottom). This animation should be staggered (each row animating with a slight delay after the previous) and use an elastic-out easing function for a natural, bouncy finish.
  - **Row Appending:** When rounds are appended to a chapter, they should animate with a slide-up motion in ascending order (from bottom to top). Like prepending, this animation should be staggered and use an elastic-out easing for consistency.
  - **SlideUp Action:** When rounds are affected by the SlideUp action (moving to a previous chapter), they should animate with a slide-up motion using an elastic-in easing function, visually representing their movement to the chapter above.
  - **SlideDown Action:** When rounds are affected by the SlideDown action (moving to a next chapter), they should animate with a slide-down motion using an elastic-in easing function, visually representing their movement to the chapter below.
  - **Chapter Creation:** Newly created chapters should "pop" into existence with an elastic-out animation, creating a visually pleasing expansion effect that draws attention to the new content.
  - **Empty Chapter Removal:** Chapters that contain no rows (after all rounds have been moved) should "squeeze" out of existence with an elastic-in animation, providing visual feedback that the empty chapter is being removed from the interface.

By organizing chapters into distinct card components, the application ensures a modular, scalable, and user-friendly presentation of chapter data, supporting both high-level overviews and detailed interactions with individual rounds.

### 7.3 Detailed Round View Functionality

A key aspect of the ChatLog Cleaner application is the ability for users to inspect an individual conversation round in detail. This detailed view is presented via a drawer interface (as implemented in the RoundDetailDrawer.tsx component) and should offer the following functionality:

- **Comprehensive Round Information:**
  - Displays the round number prominently, along with its associated chapter number (if applicable).
  - Shows a summary badge indicating the total number of lines in the round (combining both the user message and the assistant message).
  - Provides an in-depth view of both the user and assistant messages in separate, scrollable panels to ensure clarity and ease of reading.

- **Narrative Summary Display:**
  - If a narrative summary exists for the round, it is shown in a dedicated section. Otherwise, a placeholder with a message such as "No summary available" is displayed, styled in an italic and muted fashion.
  - The summary area should be visually distinct, using subtle background and typography styles to differentiate it from the raw message content.

- **Action Toolbar:**
  - The detailed view includes a set of action buttons that allow users to manage the round directly from the drawer. These actions include:
    - **ReRoll Summary:** Regenerate the narrative summary for the round. This is particularly useful if the current summary is unsatisfactory or needs to be updated.
    - **Slide Up / Slide Down:** Move the round to the previous or next chapter respectively. The interface should disable these buttons when the round is already at the boundary (first round for Slide Up, last round for Slide Down).
    - **Context Down:** Aggregate the content of the current and subsequent rounds to provide context for the next chapter, enabling smoother narrative transitions.
    - **Omit:** Mark the round to be excluded from generative summarization. When omitted, the round is displayed as a disabled row in the UI, while still accessible for further actions.

- **Navigation Between Rounds:**
  - The drawer incorporates navigation controls that enable users to move to the previous or next round without closing the detailed view. These controls are essential for quickly reviewing multiple rounds in sequence and are disabled when no previous or next round exists.

- **User Interface and Responsiveness:**
  - The detailed view is designed to be responsive and accessible, employing shadcn UI components along with Tailwind CSS for consistency with the rest of the application.
  - It uses scroll areas for message content to prevent the entire page from scrolling, ensuring that the detailed view remains fixed and focused.

- **Logging and Performance:**
  - Critical user interactions within the detailed view are logged using the custom logging solution. This assists in debugging and provides insights into user behavior.
  - The component is optimized for performance, ensuring smooth transitions, fast responsiveness, and minimal load even with detailed content.

This detailed round view functionality empowers users to thoroughly inspect and interact with individual conversation rounds, making it a crucial part of the chapter chunking and summarization workflow.
  
## 8. Architecture and Integration

- **Application Architecture**
  - bun
  - t3-stack `bunx --bun create-t3-app`
    - `nextjs@15.2`
    - `react^@18.3.1`
    - `trpc`
    - `prisma`
  - shadcn-ui

- **Frontend:**
  - Built with Next.js and React, enabling a step-by-step workflow management using React Context.
  - API interactions will be managed via tRPC endpoints.
  
- **Backend:**
  - Uses SQLite with Prisma
  - The application's server code is in the 'server/' directory, including routers for chat log processing and file management.

- **Data Flow:**
  - The application follows a linear workflow: upload → clean/format → parse rounds → chapter chunking.
  - State is maintained using context and shared among components via APIs.

## 9. Workflow Steps Summary

### 9.1 Upload/Select

- File drop zone for new files
- Table view for existing documents
- Duplicate file detection using file hash

### 9.2 Clean/Format

- Text processing rules to transform content
- Before-and-after comparison of file content
- Display of file statistics

### 9.3 Parse Rounds

- Identification of conversation rounds based on tags
- Metadata extraction (line counts, offsets, round number)
- Statistical overview of parsed rounds

### 9.4 Chapter Chunking

- Grouping rounds into chapters based on a target line count
- Refactored UI using separate chapter cards and dedicated round tables
- Support for round-specific actions and summarization flow

## 10. Testing and Validation

- **Test Cases:**
  - Each workflow step should have clearly defined test cases covering success and failure scenarios.

- **User Acceptance Testing:**
  - Test the complete workflow from file upload to chapter chunking for usability and performance.
  
- **Performance Testing:**
  - Benchmark file processing and table rendering for large files.

## 11. Future Enhancements

- Extension to include additional workflow steps.
- Enhanced generative summarization improvements using LLM APIs.
- Optional feature flags for beta testing new UI components / optimizations.

## 12. Detailed Round View Functionality

A key aspect of the ChatLog Cleaner application is the ability for users to inspect an individual conversation round in detail. This detailed view is presented via a drawer interface (as implemented in the RoundDetailDrawer.tsx component) and should offer the following functionality:

- **Comprehensive Round Information:**
  - Displays the round number prominently, along with its associated chapter number (if applicable).
  - Shows a summary badge indicating the total number of lines in the round (combining both the user message and the assistant message).
  - Provides an in-depth view of both the user and assistant messages in separate, scrollable panels to ensure clarity and ease of reading.

- **Narrative Summary Display:**
  - If a narrative summary exists for the round, it is shown in a dedicated section. Otherwise, a placeholder with a message such as "No summary available" is displayed, styled in an italic and muted fashion.
  - The summary area should be visually distinct, using subtle background and typography styles to differentiate it from the raw message content.

- **Action Toolbar:**
  - The detailed view includes a set of action buttons that allow users to manage the round directly from the drawer. These actions include:
    - **ReRoll Summary:** Regenerate the narrative summary for the round. This is particularly useful if the current summary is unsatisfactory or needs to be updated.
    - **Slide Up / Slide Down:** Move the round to the previous or next chapter respectively. The interface should disable these buttons when the round is already at the boundary (first round for Slide Up, last round for Slide Down).
    - **Context Down:** Aggregate the content of the current and subsequent rounds to provide context for the next chapter, enabling smoother narrative transitions.
    - **Omit:** Mark the round to be excluded from generative summarization. When omitted, the round is displayed as a disabled row in the UI, while still accessible for further actions.

- **Navigation Between Rounds:**
  - The drawer incorporates navigation controls that enable users to move to the previous or next round without closing the detailed view. These controls are essential for quickly reviewing multiple rounds in sequence and are disabled when no previous or next round exists.

- **User Interface and Responsiveness:**
  - The detailed view is designed to be responsive and accessible, employing shadcn UI components along with Tailwind CSS for consistency with the rest of the application.
  - It uses scroll areas for message content to prevent the entire page from scrolling, ensuring that the detailed view remains fixed and focused.

- **Logging and Performance:**
  - Critical user interactions within the detailed view are logged using the custom logging solution. This assists in debugging and provides insights into user behavior.
  - The component is optimized for performance, ensuring smooth transitions, fast responsiveness, and minimal load even with detailed content.

This detailed round view functionality empowers users to thoroughly inspect and interact with individual conversation rounds, making it a crucial part of the chapter chunking and summarization workflow.

## 13. Eager UI Updates for Workflow Steps

To enhance user experience and responsiveness, the ChatLog Cleaner application is designed to implement eager UI updates for each workflow step. By providing immediate feedback, the UI minimizes perceived latency and keeps the user engaged while backend processes complete asynchronously. Eager updates should be considered for the following workflow steps:

- **Upload/Select:**
  - As soon as a file is dropped or selected, the UI should immediately reflect a pending state.
  - The system should display an immediate acknowledgement (e.g., a loading spinner or visual confirmation) while the file's hash is being computed and duplicate checks are in progress.
  - Optimistic updates for file list views can be employed to show the new file before the entire upload process is confirmed.

- **Clean/Format:**
  - Upon initiating the cleaning process, the interface should immediately switch to a preview or processing state.
  - Side-by-side views of the original and cleaned text should update instantly, even if some details (like exact line counts or extensive diff comparisons) are refined asynchronously.
  - Visual indicators (e.g., progress bars or update notifications) should be used to communicate that cleaning is occurring in real-time.

- **Parse Rounds:**
  - As soon as the cleaning step is completed, the UI should eagerly display a preliminary parsing result.
  - Temporary placeholders or skeleton loaders can be used in the rounds summary while parsing metadata (such as round numbers and character counts) are finalized.
  - Updates regarding the number of rounds and computed statistics should appear immediately and be refined as more detailed processing completes.

- **Chapter Chunking / Data Table Interaction:**
  - When rounds are aggregated into chapters, the UI should immediately render chapter cards with basic statistics and available actions.
  - Any round-level actions (e.g., sliding, omitting, or re-rolling) should trigger immediate visual updates to the chapter card, with further backend updates processed asynchronously.
  - Real-time updates in the data table, such as changes in chapter metrics or round status, should occur optimistically to improve the flow and responsiveness of the interface.

By implementing eager UI updates, the application ensures smooth transitions and consistent user feedback across all workflow steps, ultimately enhancing the overall usability and performance perception of the ChatLog Cleaner application.

## 14. Chapter Table Layout

The chapter table in the ChatLog Cleaner application is designed as a card-based layout, implemented in the ChapterCard.tsx component. This layout provides a clear and concise overview of each chapter and its associated rounds, while supporting user interaction and advanced actions. The following describes its structure and functionality:

- **Card Container:**
  - Each chapter is represented as a card that uses Tailwind CSS for styling and shadcn UI components for consistency. The card provides a visual grouping of the chapter's content.
  
- **Header Section:**
  - **Expand/Collapse Button:** A toggle button (displaying either a ChevronDownIcon or ChevronUpIcon) allows users to expand or collapse the chapter to view its rounds. The button is accessible and provides appropriate aria-labels depending on its state.
  - **Chapter Title and Number:** The header displays the chapter number along with its title. This information is presented prominently, using typography that highlights the chapter identity.
  - **Chapter Statistics:**
    - A badge showing the number of rounds in the chapter.
    - A line count indicator that compares the actual line count of the rounds with the target line count (if specified in the chapter configuration).
    - Additional visual cues, such as ring highlights or shadows, may be applied if the chapter is highlighted or has a target line count mismatch.
  
- **Action Area:**
  - The header includes action buttons for chapter-level operations such as editing the chapter title and triggering summarization. These buttons are grouped and designed to be both intuitive and accessible.

- **Expandable Content:**
  - When expanded, the card reveals the rounds associated with the chapter. This content is rendered within an expandable area using the RoundsTable component.
  - The expandable section is animated with smooth transitions to improve user experience during expansion and collapse.
  - The rounds table provides detailed information for each round along with round-specific actions (e.g., slide up, slide down, re-roll, context down, omit, split).

- **Responsive Layout and Performance:**
  - The chapter table layout is optimized for performance through memoization (using React.memo) and efficient state management to reduce unnecessary re-renders.
  - The component layout is responsive, ensuring that chapter cards adjust their spacing and content alignment based on the viewport size.

- **Row and Chapter Animations:**
  - **Row Prepending:** When rounds are prepended to a chapter, they should animate with a slide-down motion in descending order (from top to bottom). This animation should be staggered (each row animating with a slight delay after the previous) and use an elastic-out easing function for a natural, bouncy finish.
  - **Row Appending:** When rounds are appended to a chapter, they should animate with a slide-up motion in ascending order (from bottom to top). Like prepending, this animation should be staggered and use an elastic-out easing for consistency.
  - **SlideUp Action:** When rounds are affected by the SlideUp action (moving to a previous chapter), they should animate with a slide-up motion using an elastic-in easing function, visually representing their movement to the chapter above.
  - **SlideDown Action:** When rounds are affected by the SlideDown action (moving to a next chapter), they should animate with a slide-down motion using an elastic-in easing function, visually representing their movement to the chapter below.
  - **Chapter Creation:** Newly created chapters should "pop" into existence with an elastic-out animation, creating a visually pleasing expansion effect that draws attention to the new content.
  - **Empty Chapter Removal:** Chapters that contain no rows (after all rounds have been moved) should "squeeze" out of existence with an elastic-in animation, providing visual feedback that the empty chapter is being removed from the interface.

By organizing chapters into distinct card components, the application ensures a modular, scalable, and user-friendly presentation of chapter data, supporting both high-level overviews and detailed interactions with individual rounds.

---

This document outlines the core requirements and expected behavior for the ChatLog Cleaner application. It serves as a reference for development, testing, and future enhancements.

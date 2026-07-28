# Findings Detail

## 1. Stored XSS via Note Content
*   **Severity:** High
*   **File:** `apps/app/app/routes/_app+/$orgSlug_+/notes.$noteId.tsx`
*   **Description:** The note rendering logic fetches `note.content` from the database and passes it directly to `dangerouslySetInnerHTML`. The client-side sanitization via `DOMPurify` is bypassed during the initial server-side render, allowing the raw XSS payload to be executed by the browser before React hydrates.
*   **Impact:** Attackers can execute arbitrary JavaScript in the context of other users viewing the malicious note.
*   **Execution:** Create a note with content `<img src=x onerror=alert(1)>`. When another user navigates to the note's URL, the script will execute.
*   **Recommendation:** Sanitize the content in the `loader` function using the `sanitizeNoteContent` utility before passing the data to the component.

## 2. Stored XSS via Note Comment Content
*   **Severity:** Medium
*   **File:** `apps/app/app/components/note/comment-item.tsx`
*   **Description:** Similar to note content, the `CommentItem` component renders `comment.content` using `dangerouslySetInnerHTML` without prior server-side sanitization.
*   **Impact:** Attackers can execute arbitrary JavaScript in the context of other users viewing the note containing the malicious comment.
*   **Execution:** Create a comment with content `<img src=x onerror=alert(1)>`. When another user navigates to the note containing the comment, the script will execute.
*   **Recommendation:** Sanitize all comment content in the `loader` of `notes.$noteId.tsx` using `sanitizeCommentContent` before passing it to the UI components.

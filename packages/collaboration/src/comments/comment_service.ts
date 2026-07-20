export interface CanvasComment {
  id: string;
  text: string;
  userId: string;
  timestamp: number;
  elementId: string | undefined; // Anchored to a specific element shape ID
  anchorCoords: { x: number; y: number } | undefined; // Anchored to specific coordinate positions
  resolved: boolean;
  resolvedBy?: string;
  replies: CanvasCommentReply[];
  mentions: string[];
}

export interface CanvasCommentReply {
  id: string;
  text: string;
  userId: string;
  timestamp: number;
  mentions: string[];
}

export class CollaborationCommentService {
  private readonly comments = new Map<string, CanvasComment>();

  /**
   * Adds a new comment, identifying user mentions and coordinate/element anchors.
   */
  public addComment(
    text: string,
    userId: string,
    anchor?: { elementId?: string; coords?: { x: number; y: number } }
  ): CanvasComment {
    const id = "c_" + Math.random().toString(36).substring(2, 10);
    const mentions = this.parseMentions(text);

    const comment: CanvasComment = {
      id,
      text,
      userId,
      timestamp: Date.now(),
      elementId: anchor?.elementId,
      anchorCoords: anchor?.coords,
      resolved: false,
      replies: [],
      mentions
    };

    this.comments.set(id, comment);
    return comment;
  }

  /**
   * Appends a reply to an existing comment.
   */
  public addReply(commentId: string, text: string, userId: string): CanvasCommentReply {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`CommentError: Comment thread not found for ID: ${commentId}`);
    }

    const reply: CanvasCommentReply = {
      id: "r_" + Math.random().toString(36).substring(2, 10),
      text,
      userId,
      timestamp: Date.now(),
      mentions: this.parseMentions(text)
    };

    comment.replies.push(reply);
    return reply;
  }

  /**
   * Marks comment thread as resolved.
   */
  public resolveComment(commentId: string, userId: string): void {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`CommentError: Comment thread not found for ID: ${commentId}`);
    }
    comment.resolved = true;
    comment.resolvedBy = userId;
  }

  public getComments(): CanvasComment[] {
    return Array.from(this.comments.values());
  }

  private parseMentions(text: string): string[] {
    const regex = /@([a-zA-Z0-9_-]+)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) matches.push(match[1]);
    }
    return matches;
  }
}

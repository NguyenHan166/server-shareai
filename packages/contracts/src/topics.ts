export const Topics = {
    Auth: {
        UserRegistered: "shareai.auth.user_registered",
    },
    Content: {
        PostCreated: "shareai.content.post_created",
        PromptVersionCreated: "shareai.content.prompt_version_created",
    },
    Engagement: {
        PostLiked: "shareai.engagement.post_liked",
        CommentCreated: "shareai.engagement.comment_created",
        RatingUpserted: "shareai.engagement.rating_upserted",
    },
    Social: {
        UserFollowed: "shareai.social.user_followed",
        TopicFollowed: "shareai.social.topic_followed",
        UserBlocked: "shareai.social.user_blocked",
    },
    Payments: {
        DonationSucceeded: "shareai.payments.donation_succeeded",
    },
    Messaging: {
        MessageSent: "shareai.messaging.message_sent",
    },
    Moderation: {
        ReportCreated: "shareai.moderation.report_created",
        ActionApplied: "shareai.moderation.action_applied",
    },
} as const;

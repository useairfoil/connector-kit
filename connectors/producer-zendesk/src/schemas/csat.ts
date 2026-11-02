import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { Long, LongFromString, Timestamp } from "./shared";

const AnswerSchema = Schema.Struct({
  question_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Question ID in the survey." }),
  ),
  question_type: Schema.String.pipe(
    Schema.annotateKey({
      description: "Question type, such as rating_scale_numeric or open_ended.",
    }),
  ),
  type: Schema.String.pipe(
    Schema.annotateKey({
      description: "Answer type: rating_scale, closed_ended, open_ended, or skipped.",
    }),
  ),
  rating: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Rating picked, for a rating question." }),
  ),
  rating_category: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "bad, neutral, or good, for a rating question." }),
  ),
  value: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Text written, for an open question." }),
  ),
  option_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Options picked, for a choice question." }),
  ),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the answer was last changed." }),
  ),
});

export const SurveyResponseSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Survey response ID." })),
  version: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time the latest answer was changed." }),
  ),
  ticket_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Ticket the survey was about." }),
  ),
  responder_id: Long.pipe(Schema.annotateKey({ description: "User who answered." })),
  survey_id: Schema.String.pipe(Schema.annotateKey({ description: "Survey ID." })),
  survey_version: Long.pipe(Schema.annotateKey({ description: "Survey version answered." })),
  rating: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Customer satisfaction rating, such as 1 to 5." }),
  ),
  rating_category: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer satisfaction category: bad, neutral, or good." }),
  ),
  answers: Schema.Array(AnswerSchema).pipe(
    Schema.annotateKey({ description: "Every answer in the response." }),
  ),
  expires_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time after which the answers can't change." }),
  ),
})
  .annotate({ description: "Answers to Zendesk CSAT surveys. Unanswered surveys are left out." })
  .pipe(Iceberg.identifier("id"));

export type SurveyResponse = Schema.Schema.Type<typeof SurveyResponseSchema>;

export const SurveyResponseObjectSchema = Schema.Struct({
  id: Schema.String,
  expires_at: Timestamp,
  responder_id: LongFromString,
  subjects: Schema.Array(Schema.Struct({ id: Schema.String, type: Schema.String })),
  survey: Schema.Struct({ id: Schema.String, version: Long }),
  answers: Schema.Array(
    Schema.Struct({
      type: Schema.String,
      question: Schema.Struct({
        id: Schema.String,
        type: Schema.String,
        sub_type: Schema.optional(Schema.String),
      }),
      rating: Schema.optional(Long),
      rating_category: Schema.optional(Schema.String),
      value: Schema.optional(Schema.String),
      selections: Schema.optional(Schema.Array(Schema.Struct({ option_id: Schema.String }))),
      updated_at: Timestamp,
    }),
  ),
});

export type SurveyResponseObject = Schema.Schema.Type<typeof SurveyResponseObjectSchema>;

const Text = Schema.Struct({ value: Schema.String });

export const CsatSurveySchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Survey ID." })),
  version: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time Zendesk last updated the survey." }),
  ),
  survey_version: Long.pipe(Schema.annotateKey({ description: "Current survey version." })),
  state: Schema.String.pipe(Schema.annotateKey({ description: "enabled or disabled." })),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the survey was created." })),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the survey was last updated." }),
  ),
  questions: Schema.Array(
    Schema.Struct({
      id: Schema.String.pipe(
        Schema.annotateKey({ description: "Question ID, as in `survey_responses.answers`." }),
      ),
      type: Schema.String.pipe(Schema.annotateKey({ description: "Question type." })),
      sub_type: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "customer_satisfaction for the main rating question." }),
      ),
      headline: Schema.String.pipe(Schema.annotateKey({ description: "Question text." })),
      options: Schema.Array(
        Schema.Struct({
          id: Schema.NullOr(Schema.String).pipe(
            Schema.annotateKey({ description: "Option ID, for a choice question." }),
          ),
          rating: Schema.NullOr(Long).pipe(
            Schema.annotateKey({ description: "Rating, for a rating question." }),
          ),
          label: Schema.String.pipe(
            Schema.annotateKey({ description: "Option text. Can be empty." }),
          ),
        }),
      ).pipe(Schema.annotateKey({ description: "Options of the question." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Questions in the current version." })),
})
  .annotate({ description: "Zendesk CSAT surveys. Names the IDs in `survey_responses`." })
  .pipe(Iceberg.identifier("id"));

export type CsatSurvey = Schema.Schema.Type<typeof CsatSurveySchema>;

export const CsatSurveyObjectSchema = Schema.Struct({
  id: Schema.String,
  version: Long,
  state: Schema.String,
  created_at: Timestamp,
  updated_at: Timestamp,
  questions: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      type: Schema.String,
      sub_type: Schema.optional(Schema.String),
      headline: Text,
      options: Schema.optional(
        Schema.Array(
          Schema.Struct({
            id: Schema.optional(Schema.String),
            rating: Schema.optional(Long),
            label: Text,
          }),
        ),
      ),
    }),
  ),
});

export type CsatSurveyObject = Schema.Schema.Type<typeof CsatSurveyObjectSchema>;

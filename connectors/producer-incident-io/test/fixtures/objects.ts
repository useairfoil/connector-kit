// Example responses from incident.io's OpenAPI spec,
// https://api.incident.io/v1/openapiV3.json. Generated, not hand-written.

export const examples = {
  "/v2/incidents": {
    incidents: [
      {
        call_url: "https://zoom.us/foo",
        created_at: "2021-08-17T13:28:57.801578Z",
        creator: {
          alert: {
            id: "01GW2G3V0S59R238FAHPDS1R66",
            title: "*errors.withMessage: PG::Error failed to connect",
          },
          api_key: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My test API key",
          },
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
          workflow: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My little workflow",
          },
        },
        custom_field_entries: [
          {
            custom_field: {
              description: "Which team is impacted by this issue",
              field_type: "single_select",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Affected Team",
              options: [
                {
                  custom_field_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  sort_key: 10,
                  value: "Product",
                },
              ],
            },
            values: [
              {
                value_catalog_entry: {
                  aliases: ["lawrence@incident.io", "lawrence"],
                  external_id: "761722cd-d1d7-477b-ac7e-90f9e079dc33",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  name: "Primary On-call",
                },
                value_link: "https://google.com/",
                value_numeric: "123.456",
                value_option: {
                  custom_field_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  sort_key: 10,
                  value: "Product",
                },
                value_text: "This is my text field, I hope you like it",
              },
            ],
          },
        ],
        debriefs: [
          {
            end_at: "2021-08-17T14:28:57.801578Z",
            id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            start_at: "2021-08-17T13:28:57.801578Z",
          },
        ],
        duration_metrics: [
          {
            duration_metric: {
              id: "01FCNDV6P870EA6S7TK1DSYD5H",
              name: "Lasted",
            },
            status: "success",
            value_seconds: 10800,
          },
        ],
        external_issue_reference: {
          issue_name: "INC-123",
          issue_permalink:
            "https://linear.app/incident-io/issue/INC-1609/find-copywriter-to-write-up",
          provider: "asana",
        },
        has_debrief: false,
        id: "01FDAG4SAP5TYPT98WGR2N7W91",
        incident_role_assignments: [
          {
            assignee: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
            role: {
              created_at: "2021-08-17T13:28:57.801578Z",
              description: "The person currently coordinating the incident",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              instructions:
                "Take point on the incident; Make sure people are clear on responsibilities",
              name: "Incident Lead",
              required: false,
              role_type: "lead",
              shortform: "lead",
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
          },
        ],
        incident_status: {
          category: "triage",
          created_at: "2021-08-17T13:28:57.801578Z",
          description:
            "Impact has been **fully mitigated**, and we're ready to learn from this incident.",
          id: "01FCNDV6P870EA6S7TK1DSYD5H",
          name: "Closed",
          rank: 4,
          updated_at: "2021-08-17T13:28:57.801578Z",
        },
        incident_timestamp_values: [
          {
            incident_timestamp: {
              id: "01FCNDV6P870EA6S7TK1DSYD5H",
              name: "Impact started",
              rank: 1,
            },
            value: { value: "2021-08-17T13:28:57.801578Z" },
          },
        ],
        incident_type: {
          create_in_triage: "always",
          created_at: "2021-08-17T13:28:57.801578Z",
          description: "Customer facing production outages",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          is_default: false,
          name: "Production Outage",
          private_incidents_only: false,
          updated_at: "2021-08-17T13:28:57.801578Z",
        },
        last_activity_at: "2021-08-17T13:28:57.801578Z",
        mode: "standard",
        ms_teams_channel_url:
          "https://teams.microsoft.com/l/channel/19%some-hex%40thread.tacv2/inc-123-title?groupId=some-uuid&tenantId=another-uuid",
        name: "Our database is sad",
        permalink: "https://app.incident.io/incidents/123",
        postmortem_document_ids: ["01FCNDV6P870EA6S7TK1DSYD5H"],
        postmortem_document_url: "https://docs.google.com/my_doc_id",
        reference: "INC-123",
        severity: {
          created_at: "2021-08-17T13:28:57.801578Z",
          description: "Issues with **low impact**.",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Minor",
          rank: 1,
          updated_at: "2021-08-17T13:28:57.801578Z",
        },
        slack_channel_id: "C02AW36C1M5",
        slack_channel_name: "inc-165-green-parrot",
        slack_channel_url: "https://slack.com/app_redirect?team=T1234&channel=C5678",
        slack_team_id: "T02A1FSLE8J",
        summary: "Our database is really really sad, and we don't know why yet.",
        team_ids: ["01JPQA75EPNEES4479P16P4XAB"],
        updated_at: "2021-08-17T13:28:57.801578Z",
        visibility: "public",
        workload_minutes_late: 40.7,
        workload_minutes_sleeping: 0,
        workload_minutes_total: 60.7,
        workload_minutes_working: 20,
      },
    ],
  },
  "/v2/incidents/{id}": {
    incident: {
      call_url: "https://zoom.us/foo",
      created_at: "2021-08-17T13:28:57.801578Z",
      creator: {
        alert: {
          id: "01GW2G3V0S59R238FAHPDS1R66",
          title: "*errors.withMessage: PG::Error failed to connect",
        },
        api_key: { id: "01FCNDV6P870EA6S7TK1DSYDG0", name: "My test API key" },
        user: {
          email: "lisa@incident.io",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Lisa Karlin Curtis",
          role: "owner",
          slack_user_id: "U02AYNF2XJM",
        },
        workflow: {
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "My little workflow",
        },
      },
      custom_field_entries: [
        {
          custom_field: {
            description: "Which team is impacted by this issue",
            field_type: "single_select",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Affected Team",
            options: [
              {
                custom_field_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                sort_key: 10,
                value: "Product",
              },
            ],
          },
          values: [
            {
              value_catalog_entry: {
                aliases: ["lawrence@incident.io", "lawrence"],
                external_id: "761722cd-d1d7-477b-ac7e-90f9e079dc33",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Primary On-call",
              },
              value_link: "https://google.com/",
              value_numeric: "123.456",
              value_option: {
                custom_field_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                sort_key: 10,
                value: "Product",
              },
              value_text: "This is my text field, I hope you like it",
            },
          ],
        },
      ],
      debriefs: [
        {
          end_at: "2021-08-17T14:28:57.801578Z",
          id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          start_at: "2021-08-17T13:28:57.801578Z",
        },
      ],
      duration_metrics: [
        {
          duration_metric: { id: "01FCNDV6P870EA6S7TK1DSYD5H", name: "Lasted" },
          status: "success",
          value_seconds: 10800,
        },
      ],
      external_issue_reference: {
        issue_name: "INC-123",
        issue_permalink:
          "https://linear.app/incident-io/issue/INC-1609/find-copywriter-to-write-up",
        provider: "asana",
      },
      has_debrief: false,
      id: "01FDAG4SAP5TYPT98WGR2N7W91",
      incident_role_assignments: [
        {
          assignee: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
          role: {
            created_at: "2021-08-17T13:28:57.801578Z",
            description: "The person currently coordinating the incident",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            instructions:
              "Take point on the incident; Make sure people are clear on responsibilities",
            name: "Incident Lead",
            required: false,
            role_type: "lead",
            shortform: "lead",
            updated_at: "2021-08-17T13:28:57.801578Z",
          },
        },
      ],
      incident_status: {
        category: "triage",
        created_at: "2021-08-17T13:28:57.801578Z",
        description:
          "Impact has been **fully mitigated**, and we're ready to learn from this incident.",
        id: "01FCNDV6P870EA6S7TK1DSYD5H",
        name: "Closed",
        rank: 4,
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
      incident_timestamp_values: [
        {
          incident_timestamp: {
            id: "01FCNDV6P870EA6S7TK1DSYD5H",
            name: "Impact started",
            rank: 1,
          },
          value: { value: "2021-08-17T13:28:57.801578Z" },
        },
      ],
      incident_type: {
        create_in_triage: "always",
        created_at: "2021-08-17T13:28:57.801578Z",
        description: "Customer facing production outages",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        is_default: false,
        name: "Production Outage",
        private_incidents_only: false,
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
      last_activity_at: "2021-08-17T13:28:57.801578Z",
      mode: "standard",
      ms_teams_channel_url:
        "https://teams.microsoft.com/l/channel/19%some-hex%40thread.tacv2/inc-123-title?groupId=some-uuid&tenantId=another-uuid",
      name: "Our database is sad",
      permalink: "https://app.incident.io/incidents/123",
      postmortem_document_ids: ["01FCNDV6P870EA6S7TK1DSYD5H"],
      postmortem_document_url: "https://docs.google.com/my_doc_id",
      reference: "INC-123",
      severity: {
        created_at: "2021-08-17T13:28:57.801578Z",
        description: "Issues with **low impact**.",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Minor",
        rank: 1,
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
      slack_channel_id: "C02AW36C1M5",
      slack_channel_name: "inc-165-green-parrot",
      slack_channel_url: "https://slack.com/app_redirect?team=T1234&channel=C5678",
      slack_team_id: "T02A1FSLE8J",
      summary: "Our database is really really sad, and we don't know why yet.",
      team_ids: ["01JPQA75EPNEES4479P16P4XAB"],
      updated_at: "2021-08-17T13:28:57.801578Z",
      visibility: "public",
      workload_minutes_late: 40.7,
      workload_minutes_sleeping: 0,
      workload_minutes_total: 60.7,
      workload_minutes_working: 20,
    },
  },
  "/v2/incident_updates": {
    incident_updates: [
      {
        created_at: "2021-08-17T13:28:57.801578Z",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        merged_into_incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        message: "We're working on a fix, hoping to ship in the next 30 minutes",
        new_incident_status: {
          category: "triage",
          created_at: "2021-08-17T13:28:57.801578Z",
          description:
            "Impact has been **fully mitigated**, and we're ready to learn from this incident.",
          id: "01FCNDV6P870EA6S7TK1DSYD5H",
          name: "Closed",
          rank: 4,
          updated_at: "2021-08-17T13:28:57.801578Z",
        },
        new_severity: {
          created_at: "2021-08-17T13:28:57.801578Z",
          description: "Issues with **low impact**.",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Minor",
          rank: 1,
          updated_at: "2021-08-17T13:28:57.801578Z",
        },
        updater: {
          alert: {
            id: "01GW2G3V0S59R238FAHPDS1R66",
            title: "*errors.withMessage: PG::Error failed to connect",
          },
          api_key: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My test API key",
          },
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
          workflow: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My little workflow",
          },
        },
      },
    ],
  },
  "/v2/incident_timeline_items": {
    incident_timeline_items: [
      {
        activity_log_id: "01FCNDV6P870EA6S7TK1DSYDG1",
        created_at: "2026-09-01T15:31:04Z",
        creator: {
          alert: {
            id: "01GW2G3V0S59R238FAHPDS1R66",
            title: "*errors.withMessage: PG::Error failed to connect",
          },
          api_key: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My test API key",
          },
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
          workflow: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My little workflow",
          },
        },
        description: "Rolled back **payments-api** to v411 after error rate hit 12%.",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        timestamp: "2026-09-01T15:30:00Z",
        title: "Rolled back payments-api",
        updated_at: "2026-09-01T16:45:00Z",
      },
    ],
  },
  "/v2/incident_activity_log_entries": {
    incident_activity_log_entries: [
      {
        content: {
          action_created: {
            action_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            actor: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          action_updated: {
            action_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            new_assignee: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
            new_status: "completed",
            previous_assignee: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
            previous_status: "outstanding",
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          alert_attached_to_incident: {
            actor: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
            alert_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          },
          custom_field_value_update: {
            custom_field: {
              description: "Which team is impacted by this issue",
              field_type: "single_select",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Affected Team",
              options: [
                {
                  custom_field_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  sort_key: 10,
                  value: "Product",
                },
              ],
            },
            new_values: [
              {
                value_catalog_entry: {
                  aliases: ["lawrence@incident.io", "lawrence"],
                  external_id: "761722cd-d1d7-477b-ac7e-90f9e079dc33",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  name: "Primary On-call",
                },
                value_link: "https://google.com/",
                value_numeric: "123.456",
                value_option: {
                  custom_field_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  sort_key: 10,
                  value: "Product",
                },
                value_text: "This is my text field, I hope you like it",
              },
            ],
            new_values_count: 4,
            previous_values: [
              {
                value_catalog_entry: {
                  aliases: ["lawrence@incident.io", "lawrence"],
                  external_id: "761722cd-d1d7-477b-ac7e-90f9e079dc33",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  name: "Primary On-call",
                },
                value_link: "https://google.com/",
                value_numeric: "123.456",
                value_option: {
                  custom_field_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  sort_key: 10,
                  value: "Product",
                },
                value_text: "This is my text field, I hope you like it",
              },
            ],
            previous_values_count: 3,
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          escalation_acknowledged: {
            acknowledger: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
            escalation_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          },
          escalation_created: {
            creator: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
            escalated_to_users: [
              {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
            ],
            escalation_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            escalation_path_id: "01FCNDV6P870EA6S7TK1DSYDG1",
          },
          follow_up_created: {
            actor: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
            follow_up_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          },
          follow_up_updated: {
            follow_up_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            new_assignee: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
            new_status: "completed",
            new_title: "Add a payments-api rollback runbook",
            previous_assignee: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
            previous_status: "outstanding",
            previous_title: "Add a runbook",
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          incident_merged: {
            incident_update_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            merger: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
            source_incident: {
              external_id: 123,
              id: "01FDAG4SAP5TYPT98WGR2N7W91",
              name: "Our database is sad",
              reference: "INC-123",
              status_category: "triage",
              summary: "Our database is really really sad, and we don't know why yet.",
              visibility: "public",
            },
          },
          incident_rename: {
            new_name: "EU checkout failing after 14:02 deploy",
            previous_name: "Checkout errors",
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          incident_timestamp_set: {
            incident_timestamp: {
              id: "01FCNDV6P870EA6S7TK1DSYD5H",
              name: "Impact started",
              rank: 1,
            },
            new_value: "2026-09-01T13:42:00Z",
            previous_value: "2026-09-01T14:00:00Z",
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          incident_type_changed: {
            new_incident_type: {
              create_in_triage: "always",
              created_at: "2021-08-17T13:28:57.801578Z",
              description: "Customer facing production outages",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              is_default: false,
              name: "Production Outage",
              private_incidents_only: false,
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
            previous_incident_type: {
              create_in_triage: "always",
              created_at: "2021-08-17T13:28:57.801578Z",
              description: "Customer facing production outages",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              is_default: false,
              name: "Production Outage",
              private_incidents_only: false,
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          incident_update: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            message: "Rolled back **payments-api** to v411, error rate recovering.",
            new_severity: {
              created_at: "2021-08-17T13:28:57.801578Z",
              description: "Issues with **low impact**.",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Minor",
              rank: 1,
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
            new_status: {
              category: "triage",
              created_at: "2021-08-17T13:28:57.801578Z",
              description:
                "Impact has been **fully mitigated**, and we're ready to learn from this incident.",
              id: "01FCNDV6P870EA6S7TK1DSYD5H",
              name: "Closed",
              rank: 4,
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
            next_update_in_minutes: 30,
            previous_severity: {
              created_at: "2021-08-17T13:28:57.801578Z",
              description: "Issues with **low impact**.",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Minor",
              rank: 1,
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
            previous_status: {
              category: "triage",
              created_at: "2021-08-17T13:28:57.801578Z",
              description:
                "Impact has been **fully mitigated**, and we're ready to learn from this incident.",
              id: "01FCNDV6P870EA6S7TK1DSYD5H",
              name: "Closed",
              rank: 4,
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          incident_visibility_changed: {
            new_visibility: "private",
            previous_visibility: "public",
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          role_update: {
            new_assignee: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
            previous_assignee: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
            role: {
              created_at: "2021-08-17T13:28:57.801578Z",
              description: "The person currently coordinating the incident",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              instructions:
                "Take point on the incident; Make sure people are clear on responsibilities",
              name: "Incident Lead",
              role_type: "lead",
              shortform: "lead",
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          status_change: {
            new_status: {
              category: "triage",
              created_at: "2021-08-17T13:28:57.801578Z",
              description:
                "Impact has been **fully mitigated**, and we're ready to learn from this incident.",
              id: "01FCNDV6P870EA6S7TK1DSYD5H",
              name: "Closed",
              rank: 4,
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
            previous_status: {
              category: "triage",
              created_at: "2021-08-17T13:28:57.801578Z",
              description:
                "Impact has been **fully mitigated**, and we're ready to learn from this incident.",
              id: "01FCNDV6P870EA6S7TK1DSYD5H",
              name: "Closed",
              rank: 4,
              updated_at: "2021-08-17T13:28:57.801578Z",
            },
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          summary_update: {
            new_summary: "Checkout is failing for all EU customers since the 14:02 deploy.",
            previous_summary: "Checkout is failing for some customers.",
            updater: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
          },
          workflow_ran: {
            creator: {
              alert: {
                id: "01GW2G3V0S59R238FAHPDS1R66",
                title: "*errors.withMessage: PG::Error failed to connect",
              },
              api_key: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My test API key",
              },
              user: {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
              workflow: {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "My little workflow",
              },
            },
            event_description: "Stopped the synthetic load test in staging.",
            event_title: "Load test halted",
          },
        },
        created_at: "2026-09-01T15:30:01Z",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        occurred_at: "2026-09-01T15:30:00Z",
        title: "Status changed from Investigating to Monitoring",
        type: "incident_update",
      },
    ],
  },
  "/v2/incident_participants": {
    incident_participants: {
      active: [
        {
          participant_type: "observer",
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
        },
      ],
      passive: [
        {
          participant_type: "observer",
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
        },
      ],
    },
  },
  "/v1/incident_relationships": {
    incident_relationships: [
      {
        id: "01FCNDV6P870EA6S7TK1DSYD5H",
        incident: {
          external_id: 123,
          id: "01FCNDV6P870EA6S7TK1DSYD5H",
          name: "The database is down",
        },
      },
    ],
  },
  "/v1/incident_attachments": {
    incident_attachments: [
      {
        id: "01FCNDV6P870EA6S7TK1DSYD5H",
        incident_id: "01FCNDV6P870EA6S7TK1DSYD5H",
        resource: {
          external_id: "123",
          permalink: "https://my.pagerduty.com/incidents/ABC",
          resource_type: "pager_duty_incident",
          title: "The database has gone down",
        },
      },
    ],
  },
  "/v2/incident_alerts": {
    incident_alerts: [
      {
        alert: {
          alert_group_ids: ["01GW2G3V0S59R238FAHPDS1R66"],
          alert_source_id: "01GW2G3V0S59R238FAHPDS1R66",
          created_at: "2021-08-17T13:28:57.801578Z",
          deduplication_key: "4293868629",
          description: "CPU on the payments service has exceeded 75 percent for 5 minutes",
          id: "01GW2G3V0S59R238FAHPDS1R66",
          resolved_at: "2021-08-17T14:28:57.801578Z",
          source_url: "https://www.my-alerting-platform.com/alerts/my-alert-123",
          status: "firing",
          title: "*errors.withMessage: PG::Error failed to connect",
          updated_at: "2021-08-17T13:28:57.801578Z",
        },
        alert_route_id: "01GW2G3V0S59R238FAHPDS1R67",
        id: "01GW2G3V0S59R238FAHPDS1R66",
        incident: {
          external_id: 123,
          id: "01FDAG4SAP5TYPT98WGR2N7W91",
          name: "Our database is sad",
          reference: "INC-123",
          status_category: "triage",
          summary: "Our database is really really sad, and we don't know why yet.",
          visibility: "public",
        },
      },
    ],
  },
  "/v2/call_sessions": {
    call_sessions: [
      {
        ended_at: "2021-08-17T14:28:57.801578Z",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        started_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v2/incident_participant_workloads": {
    incident_participant_workloads: [
      {
        archived_at: "2021-08-17T13:28:57.801578Z",
        participant_type: "observer",
        user: {
          email: "lisa@incident.io",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Lisa Karlin Curtis",
          role: "owner",
          slack_user_id: "U02AYNF2XJM",
        },
        workload: {
          minutes_spent_on_incident: 125.5,
          minutes_spent_on_incident_in_late_hours: 20.5,
          minutes_spent_on_incident_in_sleeping_hours: 15,
          minutes_spent_on_incident_in_working_hours: 90,
        },
      },
    ],
    metadata: { data_synced_at: "2021-08-17T13:00:00Z" },
  },
  "/v1/postmortem_documents": {
    postmortem_documents: [
      {
        created_at: "2021-08-17T13:28:57.801578Z",
        document_url:
          "https://app.incident.io/my-org/incidents/123/post-mortems/01GDZEW57FDA1K4S63MGMQ5DS9",
        editors: [
          {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "viewer",
            slack_user_id: "U02AYNF2XJM",
          },
        ],
        exported_urls: [
          "https://www.notion.so/INC-123-sad-database",
          "https://docs.google.com/document/d/1234",
        ],
        id: "01GDZEW57FDA1K4S63MGMQ5DS9",
        incident_id: "01GBA8J19SMXQWPJMX3P2ESCVG",
        status: "in_progress",
        title: "INC-123: Database is sad",
        type: "in_app",
        updated_at: "abc123",
      },
    ],
  },
  "/v1/postmortem_documents/{id}": {
    postmortem_document: {
      created_at: "2021-08-17T13:28:57.801578Z",
      document_url:
        "https://app.incident.io/my-org/incidents/123/post-mortems/01GDZEW57FDA1K4S63MGMQ5DS9",
      editors: [
        {
          email: "lisa@incident.io",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Lisa Karlin Curtis",
          role: "viewer",
          slack_user_id: "U02AYNF2XJM",
        },
      ],
      exported_urls: [
        "https://www.notion.so/INC-123-sad-database",
        "https://docs.google.com/document/d/1234",
      ],
      id: "01GDZEW57FDA1K4S63MGMQ5DS9",
      incident_id: "01GBA8J19SMXQWPJMX3P2ESCVG",
      status: "in_progress",
      title: "INC-123: Database is sad",
      type: "in_app",
      updated_at: "abc123",
    },
  },
  "/v3/follow_ups": {
    follow_ups: [
      {
        assignee: {
          email: "lisa@incident.io",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Lisa Karlin Curtis",
          role: "owner",
          slack_user_id: "U02AYNF2XJM",
        },
        assignee_team: { id: "abc123", name: "abc123" },
        category: {
          description: "Follow-ups related to infrastructure changes.",
          id: "01GNW4BAQ7XRMFF6FHKNXDFPRW",
          name: "Infrastructure",
          rank: 10,
        },
        completed_at: "2021-08-17T13:28:57.801578Z",
        created_at: "2021-08-17T13:28:57.801578Z",
        creator: {
          alert: {
            id: "01GW2G3V0S59R238FAHPDS1R66",
            title: "*errors.withMessage: PG::Error failed to connect",
          },
          api_key: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My test API key",
          },
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
          workflow: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My little workflow",
          },
        },
        description: "Call the fire brigade",
        external_issue_reference: {
          issue_name: "INC-123",
          issue_permalink:
            "https://linear.app/incident-io/issue/INC-1609/find-copywriter-to-write-up",
          provider: "asana",
        },
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        labels: ["bug", "urgent"],
        priority: {
          description: "A follow-up that requires immediate attention.",
          id: "01GNW4BAQ7XRMFF6FHKNXDFPRW",
          name: "Urgent",
          rank: 10,
        },
        status: "outstanding",
        title: "Cat is stuck in the tree",
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v3/follow_ups/{id}": {
    follow_up: {
      assignee: {
        email: "lisa@incident.io",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Lisa Karlin Curtis",
        role: "owner",
        slack_user_id: "U02AYNF2XJM",
      },
      assignee_team: { id: "abc123", name: "abc123" },
      category: {
        description: "Follow-ups related to infrastructure changes.",
        id: "01GNW4BAQ7XRMFF6FHKNXDFPRW",
        name: "Infrastructure",
        rank: 10,
      },
      completed_at: "2021-08-17T13:28:57.801578Z",
      created_at: "2021-08-17T13:28:57.801578Z",
      creator: {
        alert: {
          id: "01GW2G3V0S59R238FAHPDS1R66",
          title: "*errors.withMessage: PG::Error failed to connect",
        },
        api_key: { id: "01FCNDV6P870EA6S7TK1DSYDG0", name: "My test API key" },
        user: {
          email: "lisa@incident.io",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Lisa Karlin Curtis",
          role: "owner",
          slack_user_id: "U02AYNF2XJM",
        },
        workflow: {
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "My little workflow",
        },
      },
      description: "Call the fire brigade",
      external_issue_reference: {
        issue_name: "INC-123",
        issue_permalink:
          "https://linear.app/incident-io/issue/INC-1609/find-copywriter-to-write-up",
        provider: "asana",
      },
      id: "01FCNDV6P870EA6S7TK1DSYDG0",
      incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
      labels: ["bug", "urgent"],
      priority: {
        description: "A follow-up that requires immediate attention.",
        id: "01GNW4BAQ7XRMFF6FHKNXDFPRW",
        name: "Urgent",
        rank: 10,
      },
      status: "outstanding",
      title: "Cat is stuck in the tree",
      updated_at: "2021-08-17T13:28:57.801578Z",
    },
  },
  "/v3/actions": {
    actions: [
      {
        assignee: {
          email: "lisa@incident.io",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Lisa Karlin Curtis",
          role: "owner",
          slack_user_id: "U02AYNF2XJM",
        },
        completed_at: "2021-08-17T13:28:57.801578Z",
        created_at: "2021-08-17T13:28:57.801578Z",
        creator: {
          alert: {
            id: "01GW2G3V0S59R238FAHPDS1R66",
            title: "*errors.withMessage: PG::Error failed to connect",
          },
          api_key: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My test API key",
          },
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
          workflow: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My little workflow",
          },
        },
        description: "Call the fire brigade",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        status: "outstanding",
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v3/actions/{id}": {
    action: {
      assignee: {
        email: "lisa@incident.io",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Lisa Karlin Curtis",
        role: "owner",
        slack_user_id: "U02AYNF2XJM",
      },
      completed_at: "2021-08-17T13:28:57.801578Z",
      created_at: "2021-08-17T13:28:57.801578Z",
      creator: {
        alert: {
          id: "01GW2G3V0S59R238FAHPDS1R66",
          title: "*errors.withMessage: PG::Error failed to connect",
        },
        api_key: { id: "01FCNDV6P870EA6S7TK1DSYDG0", name: "My test API key" },
        user: {
          email: "lisa@incident.io",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Lisa Karlin Curtis",
          role: "owner",
          slack_user_id: "U02AYNF2XJM",
        },
        workflow: {
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "My little workflow",
        },
      },
      description: "Call the fire brigade",
      id: "01FCNDV6P870EA6S7TK1DSYDG0",
      incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
      status: "outstanding",
      updated_at: "2021-08-17T13:28:57.801578Z",
    },
  },
  "/v2/alerts": {
    alerts: [
      {
        alert_group_ids: ["01GW2G3V0S59R238FAHPDS1R66"],
        alert_source_id: "01GW2G3V0S59R238FAHPDS1R66",
        attributes: [
          {
            array_value: [
              {
                catalog_entry: {
                  catalog_type_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  name: "Primary On-call",
                },
                label: "Payments Team",
                literal: "SEV123",
              },
            ],
            attribute: {
              array: false,
              emoji: "fire",
              id: "01GW2G3V0S59R238FAHPDS1R66",
              name: "service",
              required: false,
              type: 'CatalogEntry["01GW2G3V0S59R238FAHPDS1R67"]',
            },
            value: {
              catalog_entry: {
                catalog_type_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Primary On-call",
              },
              label: "Payments Team",
              literal: "SEV123",
            },
          },
        ],
        created_at: "2021-08-17T13:28:57.801578Z",
        deduplication_key: "4293868629",
        description: "CPU on the payments service has exceeded 75 percent for 5 minutes",
        id: "01GW2G3V0S59R238FAHPDS1R66",
        resolved_at: "2021-08-17T14:28:57.801578Z",
        source_url: "https://www.my-alerting-platform.com/alerts/my-alert-123",
        status: "firing",
        tags: [{ id: "01GW2G3V0S59R238FAHPDS1R66", name: "noisy" }],
        title: "*errors.withMessage: PG::Error failed to connect",
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v2/alerts/{id}": {
    alert: {
      alert_group_ids: ["01GW2G3V0S59R238FAHPDS1R66"],
      alert_source_id: "01GW2G3V0S59R238FAHPDS1R66",
      attributes: [
        {
          array_value: [
            {
              catalog_entry: {
                catalog_type_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Primary On-call",
              },
              label: "Payments Team",
              literal: "SEV123",
            },
          ],
          attribute: {
            array: false,
            emoji: "fire",
            id: "01GW2G3V0S59R238FAHPDS1R66",
            name: "service",
            required: false,
            type: 'CatalogEntry["01GW2G3V0S59R238FAHPDS1R67"]',
          },
          value: {
            catalog_entry: {
              catalog_type_id: "01FCNDV6P870EA6S7TK1DSYDG0",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Primary On-call",
            },
            label: "Payments Team",
            literal: "SEV123",
          },
        },
      ],
      created_at: "2021-08-17T13:28:57.801578Z",
      deduplication_key: "4293868629",
      description: "CPU on the payments service has exceeded 75 percent for 5 minutes",
      id: "01GW2G3V0S59R238FAHPDS1R66",
      resolved_at: "2021-08-17T14:28:57.801578Z",
      source_url: "https://www.my-alerting-platform.com/alerts/my-alert-123",
      status: "firing",
      tags: [{ id: "01GW2G3V0S59R238FAHPDS1R66", name: "noisy" }],
      title: "*errors.withMessage: PG::Error failed to connect",
      updated_at: "2021-08-17T13:28:57.801578Z",
    },
  },
  "/v1/alert_notes": {
    alert_notes: [
      {
        alert_group_id: "01HB9Z8WANK6P870EA6S7TK1DS",
        alert_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        content:
          "Customer reports **checkout 500s** starting ~14:32 UTC. Investigating `payments-api`.\n\n- Error rate: ~12% on `/checkout`\n- Region: `eu-west-1`\n- See [dashboard](https://grafana.example.com/d/abc)\n",
        created_at: "2026-05-28T15:30:00Z",
        creator: {
          api_key: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My test API key",
          },
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "viewer",
            slack_user_id: "U02AYNF2XJM",
          },
        },
        id: "01J1X9J85C7Y12G8P8W8K55Q5Y",
        images: [
          {
            id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            url: "https://storage.googleapis.com/incident-io/images/...",
          },
        ],
        last_edited_at: "2026-05-28T15:35:00Z",
        updated_at: "2026-05-28T15:35:00Z",
      },
    ],
  },
  "/v2/call_routes": {
    call_routes: [
      {
        allowed_callers: [
          {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Regulator duty desk",
            phone_number: "+15551234567",
          },
        ],
        country_code: "US",
        created_at: "2021-08-17T13:28:57.801578Z",
        current_state: "active",
        custom_language: "en-US",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Regulator urgent request",
        options: [
          {
            digit: "1",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            path: [
              {
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                level: {
                  targets: [
                    {
                      id: "lawrencejones",
                      schedule_mode: "currently_on_call",
                      selected_rota_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                      type: "schedule",
                      urgency: "high",
                    },
                  ],
                },
                type: "level",
                voicemail: {
                  greeting_text:
                    "Sorry, no one is available to take your call. Please leave a message after the tone. This call will be recorded.",
                },
              },
            ],
            prompt: "For an urgent production outage, press 1",
          },
        ],
        path: [
          {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            level: {
              targets: [
                {
                  id: "lawrencejones",
                  schedule_mode: "currently_on_call",
                  selected_rota_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  type: "schedule",
                  urgency: "high",
                },
              ],
            },
            type: "level",
            voicemail: {
              greeting_text:
                "Sorry, no one is available to take your call. Please leave a message after the tone. This call will be recorded.",
            },
          },
        ],
        phone_number: "+15551234567",
        phone_number_type: "toll_free",
        responder_caller_id: "route_number",
        updated_at: "2021-08-17T13:28:57.801578Z",
        use_caller_allowlist: true,
      },
    ],
  },
  "/v1/incident_templates": {
    incident_templates: [
      {
        created_at: "2021-08-17T13:28:57.801578Z",
        expressions: [
          {
            else_branch: {
              result: {
                array_value: [
                  {
                    literal: "SEV123",
                    reference: "incident.severity",
                  },
                ],
                value: {
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              },
            },
            label: "Team Slack channel",
            operations: [
              {
                branches: {
                  branches: [
                    {
                      condition_groups: [
                        {
                          conditions: [
                            {
                              operation: {
                                label: "Lawrence Jones",
                                value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                              },
                              param_bindings: [
                                {
                                  array_value: [
                                    {
                                      literal: "SEV123",
                                      reference: "incident.severity",
                                    },
                                  ],
                                  value: {
                                    literal: "SEV123",
                                    reference: "incident.severity",
                                  },
                                },
                              ],
                              subject: {
                                label: "Priority",
                                reference: "alert.priority",
                              },
                            },
                          ],
                        },
                      ],
                      result: {
                        array_value: [
                          {
                            literal: "SEV123",
                            reference: "incident.severity",
                          },
                        ],
                        value: {
                          literal: "SEV123",
                          reference: "incident.severity",
                        },
                      },
                    },
                  ],
                  returns: {
                    array: true,
                    type: "IncidentStatus",
                  },
                },
                cast: {
                  returns: {
                    array: true,
                    type: "IncidentStatus",
                  },
                },
                concatenate: {
                  reference: "1235",
                  reference_label: "Teams",
                },
                filter: {
                  condition_groups: [
                    {
                      conditions: [
                        {
                          operation: {
                            label: "Lawrence Jones",
                            value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                          },
                          param_bindings: [
                            {
                              array_value: [
                                {
                                  literal: "SEV123",
                                  reference: "incident.severity",
                                },
                              ],
                              value: {
                                literal: "SEV123",
                                reference: "incident.severity",
                              },
                            },
                          ],
                          subject: {
                            label: "Priority",
                            reference: "alert.priority",
                          },
                        },
                      ],
                    },
                  ],
                },
                navigate: {
                  reference: "1235",
                  reference_label: "Teams",
                },
                operation_type: "navigate",
                parse: {
                  returns: {
                    array: true,
                    type: "IncidentStatus",
                  },
                  source: 'metadata.annotations["github.com/repo"]',
                },
                returns: {
                  array: true,
                  type: "IncidentStatus",
                },
              },
            ],
            reference: "abc123",
            returns: {
              array: true,
              type: "IncidentStatus",
            },
            root_reference: "incident.status",
          },
        ],
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Payments incidents",
        template: {
          custom_fields: [
            {
              binding: {
                array_value: [
                  {
                    literal: "SEV123",
                    reference: "incident.severity",
                  },
                ],
                value: {
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              },
              custom_field_id: "01FCNDV6P870EA6S7TK1DSYDG0",
              merge_strategy: "first-wins",
            },
          ],
          incident_mode: {
            binding: {
              array_value: [
                {
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
          },
          incident_type: {
            binding: {
              array_value: [
                {
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
          },
          name: {
            autogenerated: false,
            binding: {
              array_value: [
                {
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
          },
          severity: {
            binding: {
              array_value: [
                {
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
            merge_strategy: "first-wins",
          },
          start_in_triage: {
            binding: {
              array_value: [
                {
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
          },
          summary: {
            autogenerated: false,
            binding: {
              array_value: [
                {
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
          },
          workspace: {
            binding: {
              array_value: [
                {
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
          },
        },
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v2/pay_configs": {
    pay_configs: [
      {
        base_rate_cents: 1200,
        created_at: "2021-08-17T13:28:57.801578Z",
        currency: "GBP",
        id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        name: "Engineering on-call",
        one_off_rules: [
          {
            end_at: "2021-08-17T13:28:57.801578Z",
            id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            name: "Christmas day",
            rate_cents: 4800,
            start_at: "2021-08-17T13:28:57.801578Z",
          },
        ],
        published_at: "2021-08-17T13:28:57.801578Z",
        rate_time_unit: "hour",
        timezone: "Europe/London",
        updated_at: "2021-08-17T13:28:57.801578Z",
        weekly_rules: [
          {
            end_time: "17:00",
            id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            rate_cents: 2400,
            start_time: "09:00",
            weekdays: ["monday"],
          },
        ],
      },
    ],
  },
  "/v2/pay_reports": {
    pay_reports: [
      {
        created_at: "2026-04-01T09:00:00Z",
        creator: {
          api_key: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My test API key",
          },
        },
        end_date: "2026-03-31",
        id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        name: "March 2026",
        overlapping_shifts: "paid_per_schedule",
        published_at: "2026-04-01T09:00:00Z",
        schedule_ids: ["01FCNDV6P870EA6S7TK1DSYDG0"],
        start_date: "2026-03-01",
        status: "complete",
        total_duration_seconds: 3600,
        total_pay_by_currency: {
          GBP: 2400,
        },
        unpaid_shifts: "included",
        updated_at: "2026-04-01T09:00:00Z",
      },
    ],
  },
  "/v2/call_transcript_entries": {
    call_transcript_entries: [
      {
        content: "I think we should roll back the deploy.",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        medium: "spoken",
        participant_name: "Alice Smith",
        timestamp: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v2/status_page_structures/01FCNDV6P870EA6S7TK1DSYDG0": {
    current_structure: {
      items: [
        {
          component: {
            component_id: "01FCNDV6P870EA6S7TK1DSYDG1",
            display_uptime: true,
            hidden: false,
            name: "App",
          },
          group: {
            components: [
              {
                component_id: "01FCNDV6P870EA6S7TK1DSYDG1",
                display_uptime: true,
                hidden: false,
                name: "App",
              },
            ],
            description: "Services hosted in our EU data center",
            display_aggregated_uptime: true,
            hidden: false,
            id: "01FCNDV6P870EA6S7TK1DSYDG1",
            name: "EU Data center",
          },
          sub_page: {
            id: "01FCNDV6P870EA6S7TK1DSYDG1",
            items: [
              {
                component: {
                  component_id: "01FCNDV6P870EA6S7TK1DSYDG1",
                  display_uptime: true,
                  hidden: false,
                  name: "App",
                },
                group: {
                  components: [
                    {
                      component_id: "01FCNDV6P870EA6S7TK1DSYDG1",
                      display_uptime: true,
                      hidden: false,
                      name: "App",
                    },
                  ],
                  description: "Services hosted in our EU data center",
                  display_aggregated_uptime: true,
                  hidden: false,
                  id: "01FCNDV6P870EA6S7TK1DSYDG1",
                  name: "EU Data center",
                },
              },
            ],
            name: "United Kingdom",
          },
        },
      ],
    },
    display_uptime_mode: "chart_and_percentage",
    management_meta: {
      annotations: {
        "incident.io/terraform/version": "3.0.0",
      },
      managed_by: "terraform",
      source_url: "https://github.com/my-company/infrastructure",
    },
  },
  "/v2/status_pages/01FCNDV6P870EA6S7TK1DSYDG0/components/01FCNDV6P870EA6S7TK1DSYDG1/availability":
    {
      availability: {
        availability_percent: "99.94",
        component_id: "01FCNDV6P870EA6S7TK1DSYDG1",
        data_available_since: "2025-06-01T00:00:00Z",
        end_at: "2026-02-01T00:00:00Z",
        start_at: "2026-01-01T00:00:00Z",
        status_page_id: "01FCNDV6P870EA6S7TK1DSYDG0",
      },
    },
  "/v1/status-pages/01FCNDV6P870EA6S7TK1DSYDG0/incidents/01FCNDV6P870EA6S7TK1DSYDG0/response-incidents":
    {
      incidents: [
        {
          id: "01FDAG4SAH3GYPT98WGR2N7W91",
          linked_at: "2021-08-17T13:28:57.801578Z",
        },
      ],
    },
  "/v2/alert_tags": {
    alert_tags: [{ id: "01GW2G3V0S59R238FAHPDS1R66", name: "noisy" }],
    pagination_meta: {},
  },
  "/v1/postmortem_documents/{id}/content": {
    markdown:
      "# Incident Postmortem\n\n## Summary\n\nThis incident was investigated by Alice Smith and affected the API Gateway service.\n\n## Timeline\n\n### 2024-06-15 (UTC)\n\n* [10:30] **Alert fired**\n* [10:35] **Incident declared**\n\n## Follow-ups\n\n* **Add monitoring** - Assignee: Alice Smith\n",
  },
  "/v2/alert_sources": {
    alert_sources: [
      {
        alert_events_url: "https://api.incident.io/v2/alert_events/http/01GW2G3V0S59R238FAHPDS1R66",
        auto_resolve_incident_alerts: false,
        auto_resolve_timeout_minutes: 1,
        azure_devops_options: {
          project_ids: ["01GBSQF3FHF7FWZQNWGHAVQ804", "ba038695-f5f7-4490-a9ea-bf4ab3cbf483"],
        },
        email_options: {
          email_address: "lawrence@example.com",
          redactions: ["credit_card_numbers"],
          transform_expression:
            "return {\n  title: $.subject,\n  description: $.text,\n  status: $.subject.startsWith('[RESOLVED]') ? 'resolved' : 'firing',\n  deduplication_key: $.header_message_id,\n}",
        },
        filter_condition_groups: [
          {
            conditions: [
              {
                operation: {
                  label: "Lawrence Jones",
                  value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                },
                param_bindings: [
                  {
                    array_value: [
                      {
                        label: "Lawrence Jones",
                        literal: "SEV123",
                        reference: "incident.severity",
                      },
                    ],
                    value: {
                      label: "Lawrence Jones",
                      literal: "SEV123",
                      reference: "incident.severity",
                    },
                  },
                ],
                subject: {
                  label: "Incident Severity",
                  reference: "incident.severity",
                },
              },
            ],
          },
        ],
        fixed_team_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        heartbeat_options: {
          failure_threshold: 1,
          grace_period_seconds: 0,
          interval_seconds: 60,
          ping_url: "https://api.incident.io/v2/heartbeat/01GW2G3V0S59R238FAHPDS1R66/ping",
        },
        http_custom_options: {
          deduplication_key_path: "$.alert_id",
          transform_expression:
            "return {\n  title: $.title || $.name || 'Unknown Alert',\n  status: $.status === 'resolved' ? 'resolved' : 'firing',\n  description: $.description || $.message || '',\n  sourceURL: $.url || $.link || '',\n  metadata: { team: $.team, severity: $.severity }\n}",
        },
        id: "01GW2G3V0S59R238FAHPDS1R66",
        jira_options: { project_ids: ["01GBSQF3FHF7FWZQNWGHAVQ804", "10043"] },
        name: "Production Web Dashboard Alerts",
        owning_team_ids: ["01G0J1EXE7AXZ2C93K61WBPYEH"],
        rate_limit_sharding: { rate_limit_shard_key_path: "$.priority" },
        secret_token: "some-secret-token",
        source_type: "alertmanager",
        template: {
          attributes: [
            {
              alert_attribute_id: "abc123",
              binding: {
                array_value: [
                  {
                    label: "Lawrence Jones",
                    literal: "SEV123",
                    reference: "incident.severity",
                  },
                ],
                merge_strategy: "first_wins",
                value: {
                  label: "Lawrence Jones",
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              },
            },
          ],
          description: {
            label: "Lawrence Jones",
            literal: "SEV123",
            reference: "incident.severity",
          },
          expressions: [
            {
              else_branch: {
                result: {
                  array_value: [
                    {
                      label: "Lawrence Jones",
                      literal: "SEV123",
                      reference: "incident.severity",
                    },
                  ],
                  value: {
                    label: "Lawrence Jones",
                    literal: "SEV123",
                    reference: "incident.severity",
                  },
                },
              },
              label: "Team Slack channel",
              operations: [
                {
                  branches: {
                    branches: [
                      {
                        condition_groups: [
                          {
                            conditions: [
                              {
                                operation: {
                                  label: "Lawrence Jones",
                                  value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                                },
                                param_bindings: [
                                  {
                                    array_value: [
                                      {
                                        label: "Lawrence Jones",
                                        literal: "SEV123",
                                        reference: "incident.severity",
                                      },
                                    ],
                                    value: {
                                      label: "Lawrence Jones",
                                      literal: "SEV123",
                                      reference: "incident.severity",
                                    },
                                  },
                                ],
                                subject: {
                                  label: "Incident Severity",
                                  reference: "incident.severity",
                                },
                              },
                            ],
                          },
                        ],
                        result: {
                          array_value: [
                            {
                              label: "Lawrence Jones",
                              literal: "SEV123",
                              reference: "incident.severity",
                            },
                          ],
                          value: {
                            label: "Lawrence Jones",
                            literal: "SEV123",
                            reference: "incident.severity",
                          },
                        },
                      },
                    ],
                    returns: { array: true, type: "IncidentStatus" },
                  },
                  cast: { returns: { array: true, type: "IncidentStatus" } },
                  concatenate: { reference: "1235", reference_label: "Teams" },
                  filter: {
                    condition_groups: [
                      {
                        conditions: [
                          {
                            operation: {
                              label: "Lawrence Jones",
                              value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                            },
                            param_bindings: [
                              {
                                array_value: [
                                  {
                                    label: "Lawrence Jones",
                                    literal: "SEV123",
                                    reference: "incident.severity",
                                  },
                                ],
                                value: {
                                  label: "Lawrence Jones",
                                  literal: "SEV123",
                                  reference: "incident.severity",
                                },
                              },
                            ],
                            subject: {
                              label: "Incident Severity",
                              reference: "incident.severity",
                            },
                          },
                        ],
                      },
                    ],
                  },
                  navigate: { reference: "1235", reference_label: "Teams" },
                  operation_type: "navigate",
                  parse: {
                    returns: { array: true, type: "IncidentStatus" },
                    source: 'metadata.annotations["github.com/repo"]',
                  },
                  returns: { array: true, type: "IncidentStatus" },
                },
              ],
              reference: "abc123",
              returns: { array: true, type: "IncidentStatus" },
              root_reference: "incident.status",
            },
          ],
          is_private: false,
          title: {
            label: "Lawrence Jones",
            literal: "SEV123",
            reference: "incident.severity",
          },
          visible_to_teams: {
            array_value: [
              {
                label: "Lawrence Jones",
                literal: "SEV123",
                reference: "incident.severity",
              },
            ],
            value: {
              label: "Lawrence Jones",
              literal: "SEV123",
              reference: "incident.severity",
            },
          },
        },
      },
    ],
  },
  "/v3/alert_routes": {
    alert_routes: [
      {
        enabled: false,
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Production incidents",
      },
    ],
  },
  "/v2/alert_attributes": {
    alert_attributes: [
      {
        array: false,
        emoji: "fire",
        id: "01GW2G3V0S59R238FAHPDS1R66",
        name: "service",
        required: false,
        type: 'CatalogEntry["01GW2G3V0S59R238FAHPDS1R67"]',
      },
    ],
  },
  "/v2/escalations": {
    escalations: [
      {
        created_at: "2021-08-17T13:28:57.801578Z",
        creator: {
          alert: {
            id: "01GW2G3V0S59R238FAHPDS1R66",
            title: "*errors.withMessage: PG::Error failed to connect",
          },
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
          workflow: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My little workflow",
          },
        },
        description: "Database CPU has been above 90% for 5 minutes",
        escalation_path_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        events: [
          {
            channels: [
              {
                microsoft_teams_channel_id: "abc123",
                microsoft_teams_team_id: "abc123",
                slack_channel_id: "abc123",
                slack_team_id: "abc123",
              },
            ],
            event: "entered_grace_period",
            id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            occurred_at: "2021-08-17T13:28:57.801578Z",
            urgency: "high",
            users: [
              {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
            ],
          },
        ],
        id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        priority: { name: "P1" },
        related_alerts: [
          {
            alert_group_ids: ["01GW2G3V0S59R238FAHPDS1R66"],
            alert_source_id: "01GW2G3V0S59R238FAHPDS1R66",
            created_at: "2021-08-17T13:28:57.801578Z",
            deduplication_key: "4293868629",
            description: "CPU on the payments service has exceeded 75 percent for 5 minutes",
            id: "01GW2G3V0S59R238FAHPDS1R66",
            resolved_at: "2021-08-17T14:28:57.801578Z",
            source_url: "https://www.my-alerting-platform.com/alerts/my-alert-123",
            status: "firing",
            title: "*errors.withMessage: PG::Error failed to connect",
            updated_at: "2021-08-17T13:28:57.801578Z",
          },
        ],
        related_incidents: [
          {
            external_id: 123,
            id: "01FDAG4SAP5TYPT98WGR2N7W91",
            name: "Our database is sad",
            reference: "INC-123",
            status_category: "triage",
            summary: "Our database is really really sad, and we don't know why yet.",
            visibility: "public",
          },
        ],
        status: "pending",
        title: "Database CPU is high",
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v2/escalations/{id}": {
    escalation: {
      created_at: "2021-08-17T13:28:57.801578Z",
      creator: {
        alert: {
          id: "01GW2G3V0S59R238FAHPDS1R66",
          title: "*errors.withMessage: PG::Error failed to connect",
        },
        user: {
          email: "lisa@incident.io",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Lisa Karlin Curtis",
          role: "owner",
          slack_user_id: "U02AYNF2XJM",
        },
        workflow: {
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "My little workflow",
        },
      },
      description: "Database CPU has been above 90% for 5 minutes",
      escalation_path_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
      events: [
        {
          channels: [
            {
              microsoft_teams_channel_id: "abc123",
              microsoft_teams_team_id: "abc123",
              slack_channel_id: "abc123",
              slack_team_id: "abc123",
            },
          ],
          event: "entered_grace_period",
          id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          occurred_at: "2021-08-17T13:28:57.801578Z",
          urgency: "high",
          users: [
            {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
          ],
        },
      ],
      id: "01G0J1EXE7AXZ2C93K61WBPYEH",
      priority: { name: "P1" },
      related_alerts: [
        {
          alert_group_ids: ["01GW2G3V0S59R238FAHPDS1R66"],
          alert_source_id: "01GW2G3V0S59R238FAHPDS1R66",
          created_at: "2021-08-17T13:28:57.801578Z",
          deduplication_key: "4293868629",
          description: "CPU on the payments service has exceeded 75 percent for 5 minutes",
          id: "01GW2G3V0S59R238FAHPDS1R66",
          resolved_at: "2021-08-17T14:28:57.801578Z",
          source_url: "https://www.my-alerting-platform.com/alerts/my-alert-123",
          status: "firing",
          title: "*errors.withMessage: PG::Error failed to connect",
          updated_at: "2021-08-17T13:28:57.801578Z",
        },
      ],
      related_incidents: [
        {
          external_id: 123,
          id: "01FDAG4SAP5TYPT98WGR2N7W91",
          name: "Our database is sad",
          reference: "INC-123",
          status_category: "triage",
          summary: "Our database is really really sad, and we don't know why yet.",
          visibility: "public",
        },
      ],
      status: "pending",
      title: "Database CPU is high",
      updated_at: "2021-08-17T13:28:57.801578Z",
    },
  },
  "/v2/escalation_paths": {
    escalation_paths: [
      {
        current_responders: [
          {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
        ],
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        kind: "templated",
        name: "Urgent Support",
        param_bindings: {
          abc123: {
            array_value: [
              {
                label: "Lawrence Jones",
                literal: "SEV123",
                reference: "incident.severity",
              },
            ],
            value: {
              label: "Lawrence Jones",
              literal: "SEV123",
              reference: "incident.severity",
            },
          },
        },
        path: [
          {
            delay: {
              delay_interval_condition: "active",
              delay_seconds: 300,
              delay_weekday_interval_config_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            },
            escalation_path: {
              escalation_path_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            },
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            if_else: {
              conditions: [
                {
                  operation: {
                    label: "Lawrence Jones",
                    value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                  },
                  param_bindings: [
                    {
                      array_value: [
                        {
                          label: "Lawrence Jones",
                          literal: "SEV123",
                          reference: "incident.severity",
                        },
                      ],
                      value: {
                        label: "Lawrence Jones",
                        literal: "SEV123",
                        reference: "incident.severity",
                      },
                    },
                  ],
                  subject: {
                    label: "Incident Severity",
                    reference: "incident.severity",
                  },
                },
              ],
              else_path: [{}],
              then_path: [{}],
            },
            level: {
              ack_mode: "all",
              retry_config: { attempts: 3, interval_seconds: 300 },
              round_robin_config: { enabled: false, rotate_after_seconds: 120 },
              targets: [
                {
                  id: "lawrencejones",
                  schedule_mode: "currently_on_call",
                  selected_rota_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  type: "schedule",
                  urgency: "high",
                },
              ],
              time_to_ack_interval_condition: "active",
              time_to_ack_seconds: 1800,
              time_to_ack_weekday_interval_config_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            },
            notify_channel: {
              targets: [
                {
                  id: "lawrencejones",
                  schedule_mode: "currently_on_call",
                  selected_rota_id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  type: "schedule",
                  urgency: "high",
                },
              ],
              time_to_ack_interval_condition: "active",
              time_to_ack_seconds: 1800,
              time_to_ack_weekday_interval_config_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            },
            repeat: { repeat_times: 3, to_node: "01FCNDV6P870EA6S7TK1DSYDG0" },
            type: "if_else",
          },
        ],
        repeat_config: {
          delay_repeat_on_activity: false,
          repeat_after_seconds: 1800,
        },
        team_ids: ["01JPQA75EPNEES4479P16P4XAB"],
        template_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        working_hours: [
          {
            id: "abc123",
            name: "abc123",
            timezone: "abc123",
            weekday_intervals: [{ end_time: "17:00", start_time: "09:00", weekday: "monday" }],
          },
        ],
      },
    ],
  },
  "/v2/schedules": {
    schedules: [
      {
        annotations: { "incident.io/terraform/version": "3.0.0" },
        config: {
          rotations: [
            {
              effective_from: "2021-08-17T13:28:57.801578Z",
              handover_start_at: "2021-08-17T13:28:57.801578Z",
              handovers: [{ interval: 1, interval_type: "hourly" }],
              id: "01G0J1EXE7AXZ2C93K61WBPYEH",
              layers: [{ id: "01G0J1EXE7AXZ2C93K61WBPYEH", name: "Layer 1" }],
              name: "Primary On-Call Schedule",
              scheduling_mode: "fair",
              users: [
                {
                  email: "lisa@incident.io",
                  id: "01FCNDV6P870EA6S7TK1DSYDG0",
                  name: "Lisa Karlin Curtis",
                  role: "owner",
                  slack_user_id: "U02AYNF2XJM",
                },
              ],
              working_interval: [{ end_time: "17:00", start_time: "09:00", weekday: "monday" }],
              working_intervals: [{ end_time: "17:00", start_time: "09:00", weekday: "monday" }],
            },
          ],
        },
        created_at: "2021-08-17T13:28:57.801578Z",
        current_shifts: [
          {
            end_at: "2021-08-17T13:28:57.801578Z",
            entry_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            fingerprint: "01G0J1EXE7AXZ2C93K61WBPYEH",
            rotation_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            start_at: "2021-08-17T13:28:57.801578Z",
            user: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
          },
        ],
        holidays_public_config: { country_codes: ["GB", "FR"] },
        id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        name: "Primary On-Call Schedule",
        next_shifts: [
          {
            end_at: "2021-08-17T13:28:57.801578Z",
            entry_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            fingerprint: "01G0J1EXE7AXZ2C93K61WBPYEH",
            rotation_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            start_at: "2021-08-17T13:28:57.801578Z",
            user: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
          },
        ],
        permalink: "https://app.incident.io/acme/on-call/schedules/01G0J1EXE7AXZ2C93K61WBPYEH",
        team_ids: ["01JPQA75EPNEES4479P16P4XAB"],
        timezone: "Europe/London",
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v2/schedules/{id}": {
    schedule: {
      annotations: { "incident.io/terraform/version": "3.0.0" },
      config: {
        rotations: [
          {
            effective_from: "2021-08-17T13:28:57.801578Z",
            handover_start_at: "2021-08-17T13:28:57.801578Z",
            handovers: [{ interval: 1, interval_type: "hourly" }],
            id: "01G0J1EXE7AXZ2C93K61WBPYEH",
            layers: [{ id: "01G0J1EXE7AXZ2C93K61WBPYEH", name: "Layer 1" }],
            name: "Primary On-Call Schedule",
            scheduling_mode: "fair",
            users: [
              {
                email: "lisa@incident.io",
                id: "01FCNDV6P870EA6S7TK1DSYDG0",
                name: "Lisa Karlin Curtis",
                role: "owner",
                slack_user_id: "U02AYNF2XJM",
              },
            ],
            working_interval: [{ end_time: "17:00", start_time: "09:00", weekday: "monday" }],
            working_intervals: [{ end_time: "17:00", start_time: "09:00", weekday: "monday" }],
          },
        ],
      },
      created_at: "2021-08-17T13:28:57.801578Z",
      current_shifts: [
        {
          end_at: "2021-08-17T13:28:57.801578Z",
          entry_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          fingerprint: "01G0J1EXE7AXZ2C93K61WBPYEH",
          rotation_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          start_at: "2021-08-17T13:28:57.801578Z",
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
        },
      ],
      holidays_public_config: { country_codes: ["GB", "FR"] },
      id: "01G0J1EXE7AXZ2C93K61WBPYEH",
      name: "Primary On-Call Schedule",
      next_shifts: [
        {
          end_at: "2021-08-17T13:28:57.801578Z",
          entry_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          fingerprint: "01G0J1EXE7AXZ2C93K61WBPYEH",
          rotation_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          start_at: "2021-08-17T13:28:57.801578Z",
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
        },
      ],
      permalink: "https://app.incident.io/acme/on-call/schedules/01G0J1EXE7AXZ2C93K61WBPYEH",
      team_ids: ["01JPQA75EPNEES4479P16P4XAB"],
      timezone: "Europe/London",
      updated_at: "2021-08-17T13:28:57.801578Z",
    },
  },
  "/v2/schedule_entries": {
    schedule_entries: {
      final: [
        {
          end_at: "2021-08-17T13:28:57.801578Z",
          entry_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          fingerprint: "01G0J1EXE7AXZ2C93K61WBPYEH",
          rotation_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          start_at: "2021-08-17T13:28:57.801578Z",
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
        },
      ],
      overrides: [
        {
          end_at: "2021-08-17T13:28:57.801578Z",
          entry_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          fingerprint: "01G0J1EXE7AXZ2C93K61WBPYEH",
          rotation_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          start_at: "2021-08-17T13:28:57.801578Z",
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
        },
      ],
      scheduled: [
        {
          end_at: "2021-08-17T13:28:57.801578Z",
          entry_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          fingerprint: "01G0J1EXE7AXZ2C93K61WBPYEH",
          rotation_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
          start_at: "2021-08-17T13:28:57.801578Z",
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
        },
      ],
    },
  },
  "/v2/schedule_overrides": {
    overrides: [
      {
        created_at: "2021-08-17T13:28:57.801578Z",
        end_at: "2021-08-17T13:28:57.801578Z",
        id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        layer_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        rotation_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        schedule_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        start_at: "2021-08-17T13:28:57.801578Z",
        updated_at: "2021-08-17T13:28:57.801578Z",
        user: {
          email: "lisa@incident.io",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Lisa Karlin Curtis",
          role: "owner",
          slack_user_id: "U02AYNF2XJM",
        },
      },
    ],
  },
  "/v2/on_call_notification_pauses": {
    on_call_notification_pauses: [
      {
        created_at: "2021-08-17T13:28:57.801578Z",
        ends_at: "2021-08-24T13:28:57.801578Z",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        reason: "Annual leave",
        starts_at: "2021-08-17T13:28:57.801578Z",
        updated_at: "2021-08-17T13:28:57.801578Z",
        user_id: "01FCNDV6P870EA6S7TK1DSYDG0",
      },
    ],
  },
  "/v1/maintenance_windows": {
    maintenance_windows: [
      {
        alert_condition_groups: [
          {
            conditions: [
              {
                operation: {
                  label: "Lawrence Jones",
                  value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                },
                param_bindings: [
                  {
                    array_value: [
                      {
                        label: "Lawrence Jones",
                        literal: "SEV123",
                        reference: "incident.severity",
                      },
                    ],
                    value: {
                      label: "Lawrence Jones",
                      literal: "SEV123",
                      reference: "incident.severity",
                    },
                  },
                ],
                subject: {
                  label: "Incident Severity",
                  reference: "incident.severity",
                },
              },
            ],
          },
        ],
        archived_at: "2021-08-17T13:28:57.801578Z",
        created_at: "2021-08-17T13:28:57.801578Z",
        end_at: "2021-08-17T14:28:57.801578Z",
        escalation_targets: [
          {
            escalation_paths: {
              array_value: [
                {
                  label: "Lawrence Jones",
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                label: "Lawrence Jones",
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
            users: {
              array_value: [
                {
                  label: "Lawrence Jones",
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                label: "Lawrence Jones",
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
          },
        ],
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        lead: {
          alert: {
            id: "01GW2G3V0S59R238FAHPDS1R66",
            title: "*errors.withMessage: PG::Error failed to connect",
          },
          api_key: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My test API key",
          },
          user: {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
          workflow: {
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "My little workflow",
          },
        },
        name: "Planned database migration",
        notification_message: "Scheduled downtime for database migration",
        notify_channels: [
          {
            channel_id: "C0ACTHQMHS8",
            channel_name: "general",
            channel_type: "public",
            is_private: false,
          },
        ],
        notify_end_minutes_before: 5,
        notify_start_minutes_before: 15,
        owning_team_ids: ["01G0J1EXE7AXZ2C93K61WBPYEH"],
        reroute_on_end: false,
        resolve_on_end: false,
        show_in_sidebar: true,
        start_at: "2021-08-17T13:28:57.801578Z",
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v3/catalog_types": {
    catalog_types: [
      {
        annotations: { "incident.io/catalog-importer/id": "id-of-config" },
        categories: ["customer"],
        color: "yellow",
        created_at: "2021-08-17T13:28:57.801578Z",
        description: "Represents Kubernetes clusters that we run inside of GKE.",
        dynamic_resource_parameter: "abc123",
        engine_resource_type: 'CatalogEntry["PagerDutyService"]',
        estimated_count: 7,
        icon: "alert",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        is_editable: false,
        is_team_type: false,
        last_synced_at: "2021-08-17T13:28:57.801578Z",
        name: "Kubernetes Cluster",
        owning_team_ids: ["01G0J1EXE7AXZ2C93K61WBPYEH"],
        ranked: true,
        registry_type: "PagerDutyService",
        required_integrations: ["pager_duty"],
        schema: {
          attributes: [
            {
              array: false,
              backlink_attribute: "abc123",
              id: "01GW2G3V0S59R238FAHPDS1R66",
              mode: "",
              name: "tier",
              path: [{ attribute_id: "abc123", attribute_name: "abc123" }],
              type: 'Custom["Service"]',
            },
          ],
          version: 1,
        },
        source_repo_url: "https://github.com/my-company/incident-io-catalog",
        type_name: 'Custom["BackstageGroup"]',
        updated_at: "2021-08-17T13:28:57.801578Z",
        use_name_as_identifier: true,
      },
    ],
  },
  "/v3/catalog_entries": {
    catalog_entries: [
      {
        aliases: ["lawrence@incident.io", "lawrence"],
        archived_at: "2021-08-17T14:28:57.801578Z",
        attribute_values: {
          abc123: {
            array_value: [{ label: "Lawrence Jones", literal: "SEV123" }],
            value: { label: "Lawrence Jones", literal: "SEV123" },
          },
        },
        catalog_type_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        created_at: "2021-08-17T13:28:57.801578Z",
        external_id: "761722cd-d1d7-477b-ac7e-90f9e079dc33",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Primary On-call",
        rank: 3,
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
    catalog_type: {
      annotations: { "incident.io/catalog-importer/id": "id-of-config" },
      categories: ["customer"],
      color: "yellow",
      created_at: "2021-08-17T13:28:57.801578Z",
      description: "Represents Kubernetes clusters that we run inside of GKE.",
      dynamic_resource_parameter: "abc123",
      engine_resource_type: 'CatalogEntry["PagerDutyService"]',
      estimated_count: 7,
      icon: "alert",
      id: "01FCNDV6P870EA6S7TK1DSYDG0",
      is_editable: false,
      is_team_type: false,
      last_synced_at: "2021-08-17T13:28:57.801578Z",
      name: "Kubernetes Cluster",
      owning_team_ids: ["01G0J1EXE7AXZ2C93K61WBPYEH"],
      ranked: true,
      registry_type: "PagerDutyService",
      required_integrations: ["pager_duty"],
      schema: {
        attributes: [
          {
            array: false,
            backlink_attribute: "abc123",
            id: "01GW2G3V0S59R238FAHPDS1R66",
            mode: "",
            name: "tier",
            path: [{ attribute_id: "abc123", attribute_name: "abc123" }],
            type: 'Custom["Service"]',
          },
        ],
        version: 1,
      },
      source_repo_url: "https://github.com/my-company/incident-io-catalog",
      type_name: 'Custom["BackstageGroup"]',
      updated_at: "2021-08-17T13:28:57.801578Z",
      use_name_as_identifier: true,
    },
  },
  "/v2/users": {
    users: [
      {
        base_role: {
          description: "Elevated permissions for the customer success team.",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Customer Success",
          slug: "customer-success",
        },
        custom_roles: [
          {
            description: "Elevated permissions for the customer success team.",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Customer Success",
            slug: "customer-success",
          },
        ],
        email: "lisa@incident.io",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        is_active: true,
        name: "Lisa Karlin Curtis",
        role: "owner",
        seats: { on_call: "full_access", response: "viewer_only" },
        slack_user_id: "U02AYNF2XJM",
      },
    ],
  },
  "/v3/teams": {
    teams: [
      {
        catalog_entry: {
          external_id: "761722cd-d1d7-477b-ac7e-90f9e079dc33",
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          name: "Primary On-call",
        },
        id: "abc123",
        members: [
          {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            slack_user_id: "U02AYNF2XJM",
          },
        ],
        name: "abc123",
      },
    ],
  },
  "/v1/severities": {
    severities: [
      {
        created_at: "2021-08-17T13:28:57.801578Z",
        description: "Issues with **low impact**.",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Minor",
        rank: 1,
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v1/incident_statuses": {
    incident_statuses: [
      {
        category: "triage",
        created_at: "2021-08-17T13:28:57.801578Z",
        description:
          "Impact has been **fully mitigated**, and we're ready to learn from this incident.",
        id: "01FCNDV6P870EA6S7TK1DSYD5H",
        name: "Closed",
        rank: 4,
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v1/incident_types": {
    incident_types: [
      {
        create_in_triage: "always",
        created_at: "2021-08-17T13:28:57.801578Z",
        description: "Customer facing production outages",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        is_default: false,
        name: "Production Outage",
        owning_team_ids: ["01G0J1EXE7AXZ2C93K61WBPYEH"],
        private_incidents_only: false,
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v2/incident_roles": {
    incident_roles: [
      {
        created_at: "2021-08-17T13:28:57.801578Z",
        description: "The person currently coordinating the incident",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        instructions: "Take point on the incident; Make sure people are clear on responsibilities",
        name: "Incident Lead",
        role_type: "lead",
        shortform: "lead",
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v2/incident_timestamps": {
    incident_timestamps: [{ id: "01FCNDV6P870EA6S7TK1DSYD5H", name: "Impact started", rank: 1 }],
  },
  "/v2/custom_fields": {
    custom_fields: [
      {
        catalog_type_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        created_at: "2021-08-17T13:28:57.801578Z",
        description: "Which team is impacted by this issue",
        field_type: "single_select",
        filter_by: {
          catalog_attribute_id: "01H2FW182TAH0NHEVBY34SCAK0",
          custom_field_id: "01H2FW182TAH0NHEVBY34SCAK0",
        },
        fixed_filter: {
          catalog_attribute_id: "01H2FW182TAH0NHEVBY34SCAK0",
          values: ["01H2FW182TAH0NHEVBY34SCAK0", "01H2FW182TAH0NHEVBY34SCAK1"],
        },
        group_by_catalog_attribute_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        helptext_catalog_attribute_id: "01H2FW182TAH0NHEVBY34SCAK0",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Affected Team",
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v1/custom_field_options": {
    custom_field_options: [
      {
        custom_field_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        sort_key: 10,
        value: "Product",
      },
    ],
  },
  "/v2/workflows": {
    workflows: [
      {
        auto_run_mode: "confirm_before_running",
        condition_groups: [
          {
            conditions: [
              {
                operation: {
                  label: "Lawrence Jones",
                  value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                },
                param_bindings: [
                  {
                    array_value: [
                      {
                        label: "Lawrence Jones",
                        literal: "SEV123",
                        reference: "incident.severity",
                      },
                    ],
                    value: {
                      label: "Lawrence Jones",
                      literal: "SEV123",
                      reference: "incident.severity",
                    },
                  },
                ],
                subject: {
                  label: "Incident Severity",
                  reference: "incident.severity",
                },
              },
            ],
          },
        ],
        continue_on_step_error: true,
        delay: { conditions_apply_over_delay: false, for_seconds: 60 },
        expressions: [
          {
            else_branch: {
              result: {
                array_value: [
                  {
                    label: "Lawrence Jones",
                    literal: "SEV123",
                    reference: "incident.severity",
                  },
                ],
                value: {
                  label: "Lawrence Jones",
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              },
            },
            label: "Team Slack channel",
            operations: [
              {
                branches: {
                  branches: [
                    {
                      condition_groups: [
                        {
                          conditions: [
                            {
                              operation: {
                                label: "Lawrence Jones",
                                value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                              },
                              param_bindings: [
                                {
                                  array_value: [
                                    {
                                      label: "Lawrence Jones",
                                      literal: "SEV123",
                                      reference: "incident.severity",
                                    },
                                  ],
                                  value: {
                                    label: "Lawrence Jones",
                                    literal: "SEV123",
                                    reference: "incident.severity",
                                  },
                                },
                              ],
                              subject: {
                                label: "Incident Severity",
                                reference: "incident.severity",
                              },
                            },
                          ],
                        },
                      ],
                      result: {
                        array_value: [
                          {
                            label: "Lawrence Jones",
                            literal: "SEV123",
                            reference: "incident.severity",
                          },
                        ],
                        value: {
                          label: "Lawrence Jones",
                          literal: "SEV123",
                          reference: "incident.severity",
                        },
                      },
                    },
                  ],
                  returns: { array: true, type: "IncidentStatus" },
                },
                cast: { returns: { array: true, type: "IncidentStatus" } },
                concatenate: { reference: "1235", reference_label: "Teams" },
                filter: {
                  condition_groups: [
                    {
                      conditions: [
                        {
                          operation: {
                            label: "Lawrence Jones",
                            value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                          },
                          param_bindings: [
                            {
                              array_value: [
                                {
                                  label: "Lawrence Jones",
                                  literal: "SEV123",
                                  reference: "incident.severity",
                                },
                              ],
                              value: {
                                label: "Lawrence Jones",
                                literal: "SEV123",
                                reference: "incident.severity",
                              },
                            },
                          ],
                          subject: {
                            label: "Incident Severity",
                            reference: "incident.severity",
                          },
                        },
                      ],
                    },
                  ],
                },
                navigate: { reference: "1235", reference_label: "Teams" },
                operation_type: "navigate",
                parse: {
                  returns: { array: true, type: "IncidentStatus" },
                  source: 'metadata.annotations["github.com/repo"]',
                },
                returns: { array: true, type: "IncidentStatus" },
              },
            ],
            reference: "abc123",
            returns: { array: true, type: "IncidentStatus" },
            root_reference: "incident.status",
          },
        ],
        folder: "My folder 01",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        include_private_escalations: true,
        include_private_incidents: true,
        name: "My little workflow",
        once_for: [
          {
            array: false,
            key: 'incident.custom_field["01FCNDV6P870EA6S7TK1DSYDG0"]',
            label: "Incident -> Affected Team",
            type: "IncidentSeverity",
          },
        ],
        owning_team_ids: ["01G0J1EXE7AXZ2C93K61WBPYEH"],
        private_incident_scope: "owning_teams",
        runs_from: "2021-08-17T13:28:57.801578Z",
        runs_on_incident_modes: ["standard", "test", "retrospective"],
        runs_on_incidents: "newly_created",
        shortform: "page-the-ceo",
        state: "active",
        steps: [{ label: "PagerDuty Escalate", name: "pagerduty.escalate" }],
        trigger: { label: "Incident Updated", name: "incident.updated" },
        version: 3,
      },
    ],
  },
  "/v2/workflow_runs": {
    workflow_runs: [
      {
        cancelled_at: "2021-08-17T13:28:57.801578Z",
        created_at: "2021-08-17T13:28:57.801578Z",
        enqueued_at: "2021-08-17T13:28:57.801578Z",
        error: "Something went wrong and our engineers have been notified.",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_reference: "INC-123",
        progress: [
          {
            completed_at: "2021-08-17T13:28:57.801578Z",
            error: "Something went wrong and our engineers have been notified.",
            incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            incident_reference: "INC-123",
            status: "complete",
            step: "slack.post_message",
            webhook_delivery: {
              duration_ms: 412,
              endpoint: "https://example.com/hooks/incident",
              method: "POST",
              outcome: "non_2xx",
              status_code: 500,
            },
            webhook_delivery_state: "expired",
          },
        ],
        scheduled_at: "2021-08-17T13:28:57.801578Z",
        updated_at: "2021-08-17T13:28:57.801578Z",
        workflow_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        workflow_name: "Announce incident updates",
        workflow_version_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        workflow_version_number: 3,
      },
    ],
  },
  "/v2/status_pages": {
    status_pages: [
      {
        description: "This status page is our public status page.",
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        name: "Our public status page",
        public_url: "https://statuspage.incident.io/our-public-status-page",
      },
    ],
  },
  "/v2/status_page_components": {
    status_page_components: [
      {
        description: "Our iOS app",
        id: "01FCNDV6P870EA6S7TK1DSYDG1",
        management_meta: {
          annotations: { "incident.io/terraform/version": "3.0.0" },
          managed_by: "dashboard",
          source_url: "https://github.com/my-company/infrastructure",
        },
        name: "App",
      },
    ],
  },
  "/v2/status_page_incidents": {
    status_page_incidents: [
      {
        component_impacts: [
          {
            component_id: "01GW7P4ES31Q6V1ZQH321T0GJN",
            component_status: "degraded_performance",
            end_at: "2021-08-17T13:28:57.801578Z",
            start_at: "2021-08-17T13:28:57.801578Z",
          },
        ],
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        incident_status: "investigating",
        name: "Elevated API latency",
        published_at: "2021-08-17T13:28:57.801578Z",
        status_page_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        updates: [
          {
            component_statuses: [
              {
                component_id: "01FCNDV6P870EA6S7TK1DSYDG2",
                component_status: "operational",
              },
            ],
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            incident_status: "investigating",
            message: "abc123",
            published_at: "2021-08-17T13:28:57.801578Z",
            status_page_incident_id: "01FCNDV6P870EA6S7TK1DSYDG1",
          },
        ],
      },
    ],
  },
  "/v2/status_page_incidents/{status_page_incident_id}": {
    status_page_incident: {
      component_impacts: [
        {
          component_id: "01GW7P4ES31Q6V1ZQH321T0GJN",
          component_status: "degraded_performance",
          end_at: "2021-08-17T13:28:57.801578Z",
          start_at: "2021-08-17T13:28:57.801578Z",
        },
      ],
      id: "01FCNDV6P870EA6S7TK1DSYDG0",
      incident_status: "investigating",
      name: "Elevated API latency",
      published_at: "2021-08-17T13:28:57.801578Z",
      status_page_id: "01FCNDV6P870EA6S7TK1DSYDG0",
      updates: [
        {
          component_statuses: [
            {
              component_id: "01FCNDV6P870EA6S7TK1DSYDG2",
              component_status: "operational",
            },
          ],
          id: "01FCNDV6P870EA6S7TK1DSYDG0",
          incident_status: "investigating",
          message: "abc123",
          published_at: "2021-08-17T13:28:57.801578Z",
          status_page_incident_id: "01FCNDV6P870EA6S7TK1DSYDG1",
        },
      ],
    },
  },
  "/v2/status_page_maintenances": {
    status_page_maintenances: [
      {
        automate_maintenance_status: true,
        component_maintenance_periods: [
          {
            component_id: "01GW7P4ES31Q6V1ZQH321T0GJN",
            end_at: "2021-08-17T13:28:57.801578Z",
            start_at: "2021-08-17T13:28:57.801578Z",
          },
        ],
        id: "01FCNDV6P870EA6S7TK1DSYDG0",
        maintenance_status: "maintenance_scheduled",
        name: "Routine infrastructure upgrade",
        published_at: "2021-08-17T13:28:57.801578Z",
        status_page_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        updates: [
          {
            component_statuses: [
              {
                component_id: "01FCNDV6P870EA6S7TK1DSYDG2",
                component_status: "operational",
              },
            ],
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            maintenance_status: "maintenance_scheduled",
            message: "abc123",
            published_at: "2021-08-17T13:28:57.801578Z",
            status_page_maintenance_id: "01FCNDV6P870EA6S7TK1DSYDG1",
          },
        ],
      },
    ],
  },
  "/v2/policies": {
    policies: [
      {
        assignment_rules: {
          bindings: [
            {
              array_value: [
                {
                  label: "Lawrence Jones",
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                label: "Lawrence Jones",
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
          ],
          reminder_cadence_after: { interval: "daily" },
          reminder_cadence_before: { interval: "daily" },
          reminder_detected_date_offset_hours: [0, 48],
          reminder_due_date_offset_hours: [-24, 0, 24],
        },
        conditions: [
          {
            conditions: [
              {
                operation: {
                  label: "Lawrence Jones",
                  value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                },
                param_bindings: [
                  {
                    array_value: [
                      {
                        label: "Lawrence Jones",
                        literal: "SEV123",
                        reference: "incident.severity",
                      },
                    ],
                    value: {
                      label: "Lawrence Jones",
                      literal: "SEV123",
                      reference: "incident.severity",
                    },
                  },
                ],
                subject: {
                  label: "Incident Severity",
                  reference: "incident.severity",
                },
              },
            ],
          },
        ],
        created_at: "2021-08-17T13:28:57.801578Z",
        debrief: {
          due_date_config: {
            applies_from: "2021-08-17T13:28:57.801578Z",
            calculation_timezone: "Europe/London",
            calculation_type: "weekdays",
            days: {
              array_value: [
                {
                  label: "Lawrence Jones",
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                label: "Lawrence Jones",
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
            incident_timestamp_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          },
          requirements: [
            {
              conditions: [
                {
                  operation: {
                    label: "Lawrence Jones",
                    value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                  },
                  param_bindings: [
                    {
                      array_value: [
                        {
                          label: "Lawrence Jones",
                          literal: "SEV123",
                          reference: "incident.severity",
                        },
                      ],
                      value: {
                        label: "Lawrence Jones",
                        literal: "SEV123",
                        reference: "incident.severity",
                      },
                    },
                  ],
                  subject: {
                    label: "Incident Severity",
                    reference: "incident.severity",
                  },
                },
              ],
            },
          ],
          run_on_private_incidents: false,
        },
        description:
          "All critical incidents must export follow-ups to an external issue tracker before 7 days has passed since closure.",
        expressions: [
          {
            else_branch: {
              result: {
                array_value: [
                  {
                    label: "Lawrence Jones",
                    literal: "SEV123",
                    reference: "incident.severity",
                  },
                ],
                value: {
                  label: "Lawrence Jones",
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              },
            },
            label: "Team Slack channel",
            operations: [
              {
                branches: {
                  branches: [
                    {
                      condition_groups: [
                        {
                          conditions: [
                            {
                              operation: {
                                label: "Lawrence Jones",
                                value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                              },
                              param_bindings: [
                                {
                                  array_value: [
                                    {
                                      label: "Lawrence Jones",
                                      literal: "SEV123",
                                      reference: "incident.severity",
                                    },
                                  ],
                                  value: {
                                    label: "Lawrence Jones",
                                    literal: "SEV123",
                                    reference: "incident.severity",
                                  },
                                },
                              ],
                              subject: {
                                label: "Incident Severity",
                                reference: "incident.severity",
                              },
                            },
                          ],
                        },
                      ],
                      result: {
                        array_value: [
                          {
                            label: "Lawrence Jones",
                            literal: "SEV123",
                            reference: "incident.severity",
                          },
                        ],
                        value: {
                          label: "Lawrence Jones",
                          literal: "SEV123",
                          reference: "incident.severity",
                        },
                      },
                    },
                  ],
                  returns: { array: true, type: "IncidentStatus" },
                },
                cast: { returns: { array: true, type: "IncidentStatus" } },
                concatenate: { reference: "1235", reference_label: "Teams" },
                filter: {
                  condition_groups: [
                    {
                      conditions: [
                        {
                          operation: {
                            label: "Lawrence Jones",
                            value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                          },
                          param_bindings: [
                            {
                              array_value: [
                                {
                                  label: "Lawrence Jones",
                                  literal: "SEV123",
                                  reference: "incident.severity",
                                },
                              ],
                              value: {
                                label: "Lawrence Jones",
                                literal: "SEV123",
                                reference: "incident.severity",
                              },
                            },
                          ],
                          subject: {
                            label: "Incident Severity",
                            reference: "incident.severity",
                          },
                        },
                      ],
                    },
                  ],
                },
                navigate: { reference: "1235", reference_label: "Teams" },
                operation_type: "navigate",
                parse: {
                  returns: { array: true, type: "IncidentStatus" },
                  source: 'metadata.annotations["github.com/repo"]',
                },
                returns: { array: true, type: "IncidentStatus" },
              },
            ],
            reference: "abc123",
            returns: { array: true, type: "IncidentStatus" },
            root_reference: "incident.status",
          },
        ],
        follow_up: {
          due_date_config: {
            applies_from: "2021-08-17T13:28:57.801578Z",
            calculation_timezone: "Europe/London",
            calculation_type: "weekdays",
            days: {
              array_value: [
                {
                  label: "Lawrence Jones",
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                label: "Lawrence Jones",
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
            incident_timestamp_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          },
          requirements: [
            {
              conditions: [
                {
                  operation: {
                    label: "Lawrence Jones",
                    value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                  },
                  param_bindings: [
                    {
                      array_value: [
                        {
                          label: "Lawrence Jones",
                          literal: "SEV123",
                          reference: "incident.severity",
                        },
                      ],
                      value: {
                        label: "Lawrence Jones",
                        literal: "SEV123",
                        reference: "incident.severity",
                      },
                    },
                  ],
                  subject: {
                    label: "Incident Severity",
                    reference: "incident.severity",
                  },
                },
              ],
            },
          ],
          run_on_private_incidents: false,
        },
        id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        name: "Critical incidents must export follow-ups",
        on_call_readiness: {
          enforcement: "advisory",
          high_urgency: [{ max_delay_seconds: 300, method_types: ["slack"] }],
          low_urgency: [{ max_delay_seconds: 300, method_types: ["slack"] }],
        },
        policy_type: "follow_up",
        post_mortem: {
          due_date_config: {
            applies_from: "2021-08-17T13:28:57.801578Z",
            calculation_timezone: "Europe/London",
            calculation_type: "weekdays",
            days: {
              array_value: [
                {
                  label: "Lawrence Jones",
                  literal: "SEV123",
                  reference: "incident.severity",
                },
              ],
              value: {
                label: "Lawrence Jones",
                literal: "SEV123",
                reference: "incident.severity",
              },
            },
            incident_timestamp_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          },
          requirements: [
            {
              conditions: [
                {
                  operation: {
                    label: "Lawrence Jones",
                    value: "01FCQSP07Z74QMMYPDDGQB9FTG",
                  },
                  param_bindings: [
                    {
                      array_value: [
                        {
                          label: "Lawrence Jones",
                          literal: "SEV123",
                          reference: "incident.severity",
                        },
                      ],
                      value: {
                        label: "Lawrence Jones",
                        literal: "SEV123",
                        reference: "incident.severity",
                      },
                    },
                  ],
                  subject: {
                    label: "Incident Severity",
                    reference: "incident.severity",
                  },
                },
              ],
            },
          ],
          run_on_private_incidents: false,
        },
        schedule: {
          evaluation_level: "schedule",
          requirement_type: "contiguous",
        },
        status: "enabled",
        updated_at: "2021-08-17T13:28:57.801578Z",
      },
    ],
  },
  "/v2/policy_findings": {
    policy_findings: [
      {
        created_at: "2021-08-17T13:28:57.801578Z",
        days: 3,
        debrief: { incident_id: "01FCNDV6P870EA6S7TK1DSYDG0" },
        dismissal: {
          dismissed_at: "2021-08-17T13:28:57.801578Z",
          dismissed_by: {
            alert: {
              id: "01GW2G3V0S59R238FAHPDS1R66",
              title: "*errors.withMessage: PG::Error failed to connect",
            },
            api_key: {
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "My test API key",
            },
            user: {
              email: "lisa@incident.io",
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "Lisa Karlin Curtis",
              role: "owner",
              slack_user_id: "U02AYNF2XJM",
            },
            workflow: {
              id: "01FCNDV6P870EA6S7TK1DSYDG0",
              name: "My little workflow",
            },
          },
          reason: "This incident is special.",
        },
        due_at: "2025-10-14T00:00:00.000000Z",
        follow_up: {
          follow_up_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          incident_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        },
        id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        last_checked_at: "2021-08-17T13:28:57.801578Z",
        on_call_readiness: {
          high_urgency: [{ max_delay_seconds: 300, met: false, method_types: ["slack"] }],
          low_urgency: [{ max_delay_seconds: 300, met: false, method_types: ["slack"] }],
          user_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        },
        policy_id: "01G0J1EXE7AXZ2C93K61WBPYEH",
        policy_type: "follow_up",
        post_mortem: { incident_id: "01FCNDV6P870EA6S7TK1DSYDG0" },
        responsible_users: [
          {
            email: "lisa@incident.io",
            id: "01FCNDV6P870EA6S7TK1DSYDG0",
            name: "Lisa Karlin Curtis",
            role: "owner",
            slack_user_id: "U02AYNF2XJM",
          },
        ],
        schedule: {
          cause: "nobody_scheduled",
          end_at: "2021-08-17T13:28:57.801578Z",
          has_unscheduled_time: true,
          impacted_users: [
            {
              cause: "no_on_call_seat",
              name: "Alice Green",
              user_id: "01FCNDV6P870EA6S7TK1DSYDG0",
            },
          ],
          rotation_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          schedule_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          start_at: "2021-08-17T13:28:57.801578Z",
        },
        shift_conflict: {
          end_at: "2021-08-17T13:28:57.801578Z",
          shifts: [
            {
              end_at: "2021-08-17T13:28:57.801578Z",
              layer_id: "01FCNDV6P870EA6S7TK1DSYDG0",
              rotation_id: "01FCNDV6P870EA6S7TK1DSYDG0",
              schedule_id: "01FCNDV6P870EA6S7TK1DSYDG0",
              start_at: "2021-08-17T13:28:57.801578Z",
            },
          ],
          start_at: "2021-08-17T13:28:57.801578Z",
          user_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        },
        state: "active",
        updated_at: "2021-08-17T13:28:57.801578Z",
        vacation_conflict: {
          end_at: "2021-08-17T13:28:57.801578Z",
          holiday_name: "Joe Bloggs - Holiday",
          rotation_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          schedule_id: "01FCNDV6P870EA6S7TK1DSYDG0",
          start_at: "2021-08-17T13:28:57.801578Z",
          user_id: "01FCNDV6P870EA6S7TK1DSYDG0",
        },
      },
    ],
  },
} as const;

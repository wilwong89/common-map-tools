/* eslint-disable max-len */
import { NIL, v4 as uuidv4 } from 'uuid';

import stamps from '../stamps';

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return (
    Promise.resolve()
      // Create public schema triggers
      .then(() =>
        knex.schema.raw(`create or replace function set_updated_at()
          returns trigger
          language plpgsql
          as $$
          begin
            new."updated_at" = now();
            return new;
          end;
          $$`)
      )

      // Create public schema tables
      .then(() =>
        knex.schema.createTable('identity_provider', (table) => {
          table.text('idp').primary();
          table.boolean('active').notNullable().defaultTo(true);
          stamps(knex, table);
        })
      )

      .then(() =>
        knex.schema.createTable('user', (table) => {
          table.uuid('user_id').primary();
          table.uuid('identity_id').index();
          table.text('idp').references('idp').inTable('identity_provider').onUpdate('CASCADE').onDelete('CASCADE');
          table.text('username').notNullable().index();
          table.text('email').index();
          table.text('first_name');
          table.text('full_name');
          table.text('last_name');
          table.boolean('active').notNullable().defaultTo(true);
          stamps(knex, table);
        })
      )

      .then(() =>
        knex.schema.createTable('layer', (table) => {
          table.specificType('layer_id', 'integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY');
          table.text('name').notNullable();
          stamps(knex, table);
        })
      )

      .then(() =>
        knex.schema.createTable('feature', (table) => {
          table.specificType('feature_id', 'integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY');
          table.integer('layer_id').references('layer_id').inTable('layer').onUpdate('CASCADE').onDelete('CASCADE');
          table.text('geo_type').notNullable();
          table.json('geo_json').notNullable();
          stamps(knex, table);
        })
      )

      // Create public schema functions
      .then(() =>
        knex.schema.raw(`create or replace function public.get_activity_statistics(
          date_from text,
          date_to text,
          month_year text,
          user_id uuid
        )
        returns table (
          total_submissions bigint,
          total_submissions_between bigint,
          total_submissions_monthyear bigint,
          total_submissions_assignedto bigint,
          intake_submitted bigint,
          intake_assigned bigint,
          intake_completed bigint,
          state_new bigint,
          state_inprogress bigint,
          state_delayed bigint,
          state_completed bigint,
          waiting_on bigint,
          queue_0 bigint,
          queue_1 bigint,
          queue_2 bigint,
          queue_3 bigint,
          queue_4 bigint,
          queue_5 bigint,
          guidance bigint,
          status_request bigint,
          inquiry bigint,
          emergency_assist bigint,
          inapplicable bigint
        )
        language plpgsql
        as $$
        begin
            return query
            select
              count(*),
              (select count(*) from public.submission where "submitted_at" between cast(date_from as timestamp) and cast(date_to as timestamp)),
              (select count(*) from public.submission where extract(month from cast(month_year as timestamp)) = extract(month from "submitted_at") and extract(year from cast(month_year as timestamp)) = extract(year from "submitted_at")),
              (select count(*) from public.submission where "assigned_user_id" = user_id),
              count(*) filter (where s."intake_status" = 'Submitted'),
              count(*) filter (where s."intake_status" = 'Assigned'),
              count(*) filter (where s."intake_status" = 'Completed'),
              count(*) filter (where s."application_status" = 'New'),
              count(*) filter (where s."application_status" = 'In Progress'),
              count(*) filter (where s."application_status" = 'Delayed'),
              count(*) filter (where s."application_status" = 'Completed'),
              count(*) filter (where s."waiting_on" is not null),
              count(*) filter (where s."queue_priority" = 0),
              count(*) filter (where s."queue_priority" = 1),
              count(*) filter (where s."queue_priority" = 2),
              count(*) filter (where s."queue_priority" = 3),
              count(*) filter (where s."queue_priority" = 4),
              count(*) filter (where s."queue_priority" = 5),
              count(*) filter (where s."guidance" = true),
              count(*) filter (where s."status_request" = true),
              count(*) filter (where s."inquiry" = true),
              count(*) filter (where s."emergency_assist" = true),
              count(*) filter (where s."inapplicable" = true)
            from public.submission s;
        end; $$`)
      )

      // Create audit schema and logged_actions table
      .then(() => knex.schema.raw('CREATE SCHEMA IF NOT EXISTS audit'))

      .then(() =>
        knex.schema.withSchema('audit').createTable('logged_actions', (table) => {
          table.specificType('id', 'integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY');
          table.text('schema_name').notNullable().index();
          table.text('table_name').notNullable().index();
          table.text('db_user').notNullable();
          table.text('updated_by_username');
          table.timestamp('action_timestamp', { useTz: true }).defaultTo(knex.fn.now()).index();
          table.text('action').notNullable().index();
          table.json('original_data');
          table.json('new_data');
        })
      )

      .then(() =>
        knex.schema.raw(`CREATE OR REPLACE FUNCTION audit.if_modified_func() RETURNS trigger AS $body$
          DECLARE
              v_old_data json;
              v_new_data json;

          BEGIN
              if (TG_OP = 'UPDATE') then
                  v_old_data := row_to_json(OLD);
                  v_new_data := row_to_json(NEW);
                  insert into audit.logged_actions ("schema_name", "table_name", "db_user", "updated_by_username", "action_timestamp", "action", "original_data", "new_data")
                  values (TG_TABLE_SCHEMA::TEXT, TG_TABLE_NAME::TEXT, SESSION_USER::TEXT, NEW."updated_by", now(), TG_OP::TEXT, v_old_data, v_new_data);
                  RETURN NEW;
              elsif (TG_OP = 'DELETE') then
                  v_old_data := row_to_json(OLD);
                  insert into audit.logged_actions ("schema_name", "table_name", "db_user", "action_timestamp", "action", "original_data")
                  values (TG_TABLE_SCHEMA::TEXT, TG_TABLE_NAME::TEXT, SESSION_USER::TEXT, now(), TG_OP::TEXT, v_old_data);
                  RETURN OLD;
              else
                  RAISE WARNING '[AUDIT.IF_MODIFIED_FUNC] - Other action occurred: %, at %', TG_OP, now();
                  RETURN NULL;
              end if;

          EXCEPTION
              WHEN data_exception THEN
                  RAISE WARNING '[AUDIT.IF_MODIFIED_FUNC] - UDF ERROR [DATA EXCEPTION] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
                  RETURN NULL;
              WHEN unique_violation THEN
                  RAISE WARNING '[AUDIT.IF_MODIFIED_FUNC] - UDF ERROR [UNIQUE] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
                  RETURN NULL;
              WHEN others THEN
                  RAISE WARNING '[AUDIT.IF_MODIFIED_FUNC] - UDF ERROR [OTHER] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
                  RETURN NULL;

          END;
          $body$
          LANGUAGE plpgsql
          SECURITY DEFINER
          SET search_path = pg_catalog, audit;`)
      )

      // Create audit triggers
      .then(() =>
        knex.schema.raw(`CREATE TRIGGER audit_identity_provider_trigger
          AFTER UPDATE OR DELETE ON identity_provider
          FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`)
      )

      .then(() =>
        knex.schema.raw(`CREATE TRIGGER audit_user_trigger
          AFTER UPDATE OR DELETE ON "user"
          FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`)
      )

      .then(() =>
        knex.schema.raw(`CREATE TRIGGER audit_layer_trigger
          AFTER UPDATE OR DELETE ON "layer"
          FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`)
      )

      .then(() =>
        knex.schema.raw(`CREATE TRIGGER audit_feature_trigger
          AFTER UPDATE OR DELETE ON "feature"
          FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`)
      )

      // Populate Baseline Data
      .then(() => {
        const users = ['system'];
        const items = users.map((user) => ({
          user_id: NIL,
          username: user,
          active: true,
          created_by: NIL
        }));
        return knex('user').insert(items);
      })
  );
}

export async function down(knex: Knex): Promise<void> {
  return (
    Promise.resolve()
      // Drop audit triggers
      .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_feature_trigger ON "feature"'))
      .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_layer_trigger ON "layer"'))
      .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_user_trigger ON "user"'))
      .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_identity_provider_trigger ON identity_provider'))
      // Drop audit schema and logged_actions table
      .then(() => knex.schema.raw('DROP FUNCTION IF EXISTS audit.if_modified_func'))
      .then(() => knex.schema.withSchema('audit').dropTableIfExists('logged_actions'))
      .then(() => knex.schema.dropSchemaIfExists('audit'))
      // Drop public schema tables
      .then(() => knex.schema.dropTableIfExists('feature'))
      .then(() => knex.schema.dropTableIfExists('layer'))
      .then(() => knex.schema.dropTableIfExists('user'))
      .then(() => knex.schema.dropTableIfExists('identity_provider'))
  );
}

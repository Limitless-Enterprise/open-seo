CREATE TABLE "research_search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"feature" text NOT NULL,
	"payload_json" text NOT NULL,
	"dedup_key" text NOT NULL,
	"searched_by_user_id" text NOT NULL,
	"searched_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_search_history" ADD CONSTRAINT "research_search_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_search_history" ADD CONSTRAINT "research_search_history_searched_by_user_id_user_id_fk" FOREIGN KEY ("searched_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "research_search_history_project_feature_dedup_idx" ON "research_search_history" USING btree ("project_id","feature","dedup_key");--> statement-breakpoint
CREATE INDEX "research_search_history_project_feature_searched_at_idx" ON "research_search_history" USING btree ("project_id","feature","searched_at");

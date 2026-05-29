import { Module } from "@nestjs/common";
import { CorpusModule } from "@study-note/corpus";
import { PersonaModule } from "@study-note/persona-engine";
import { AuthController } from "./auth/auth.controller";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "@study-note/auth";
import { HealthController } from "./health.controller";
import { MaterialsModule } from "./materials/materials.module";
import { ConversationController } from "./persona/conversation.controller";
import { PersonaTurnController } from "./persona/persona-turn.controller";
import { PrismaModule } from "@study-note/persistence";
import { UserNotesModule } from "./user-notes/user-notes.module";
import { PdfAnnotationsModule } from "./pdf-annotations/pdf-annotations.module";
import { TermsModule } from "./terms/terms.module";
import { SubjectsModule } from "./subjects/subjects.module";
import { MetricsModule } from "./observability/metrics.module";
import { TelemetryModule } from "./telemetry/telemetry.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StorageModule,
    CorpusModule,
    PersonaModule,
    AdminModule,
    MaterialsModule,
    UserNotesModule,
    PdfAnnotationsModule,
    TermsModule,
    SubjectsModule,
    MetricsModule,
    TelemetryModule
  ],
  controllers: [
    AuthController,
    HealthController,
    PersonaTurnController,
    ConversationController
  ],
  providers: []
})
export class AppModule {}

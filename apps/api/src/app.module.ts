import { Module } from "@nestjs/common";
import { CorpusModule } from "@study-note/corpus";
import { PersonaModule } from "@study-note/persona-engine";
import { AuthController } from "./auth/auth.controller";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "@study-note/auth";
import { HealthController } from "./health.controller";
import { MaterialsController } from "./materials/materials.controller";
import { MaterialsService } from "./materials/materials.service";
import { ConversationController } from "./persona/conversation.controller";
import { PersonaTurnController } from "./persona/persona-turn.controller";
import { PrismaModule } from "@study-note/persistence";
import { createStorageProvider, StoragePort } from "@study-note/storage";
import { UserNotesModule } from "./user-notes/user-notes.module";
import { PdfAnnotationsModule } from "./pdf-annotations/pdf-annotations.module";
import { TermsModule } from "./terms/terms.module";
import { SubjectsModule } from "./subjects/subjects.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CorpusModule,
    PersonaModule,
    AdminModule,
    UserNotesModule,
    PdfAnnotationsModule,
    TermsModule,
    SubjectsModule
  ],
  controllers: [
    AuthController,
    HealthController,
    MaterialsController,
    PersonaTurnController,
    ConversationController
  ],
  providers: [
    MaterialsService,
    {
      provide: StoragePort,
      useFactory: createStorageProvider
    }
  ]
})
export class AppModule {}

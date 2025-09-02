import { pgTable, serial, text, integer, timestamp, jsonb, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  }
);

// User storage table for authentication  
export const users = pgTable("users", {
  id: text("id").primaryKey(), // String ID from auth provider
  username: text("username").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  location: text("location"),
  website: text("website"),
  isProducer: boolean("is_producer").default(false),
  planType: text("plan_type").default("free"), // 'free' | 'pro' | 'power'
  createdAt: timestamp("created_at").defaultNow(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productionCompanies = pgTable("production_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  services: text("services").array(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  logo: text("logo"),
  coverImage: text("cover_image"), // URL da imagem de capa
  images: text("images").array(), // Array de URLs das imagens da galeria
  rating: numeric("rating", { precision: 2, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0),
  verified: boolean("verified").default(false),
  planType: text("plan_type").default("free"),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Using 'name' to match existing database structure
  description: text("description"),
  genre: text("genre"),
  status: text("status").default("esboço"), // 'esboço' | 'pré-produção' | 'produção' | 'pós-produção' | 'finalizado'
  budget: numeric("budget", { precision: 12, scale: 2 }),
  userId: text("user_id").references(() => users.id).notNull(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull().default("Novo Projeto"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id).notNull(),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id).notNull(),
  type: text("type").notNull(), // 'overview' | 'character' | 'budget' | 'schedule' | 'script' | 'treatment'
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => productionCompanies.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Editais table for storing tender/grant information
export const editais = pgTable("editais", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao").notNull(),
  orgaoResponsavel: text("orgao_responsavel").notNull(),
  valorTotal: numeric("valor_total", { precision: 12, scale: 2 }),
  valorMaximoPorProjeto: numeric("valor_maximo_por_projeto", { precision: 12, scale: 2 }),
  prazoInscricao: timestamp("prazo_inscricao").notNull(),
  dataResultado: timestamp("data_resultado").notNull(),
  status: text("status").notNull().default("aberto"), // 'aberto' | 'encerrado'
  tipoVerba: text("tipo_verba").notNull().default("publica"), // 'publica' | 'privada'
  areasContempladas: text("areas_contempladas").array(),
  requisitosBasicos: text("requisitos_basicos").array(),
  local: text("local").notNull(),
  emailContato: text("email_contato"),
  telefoneContato: text("telefone_contato"),
  linkEdital: text("link_edital"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // AI Analysis fields populated after processing PDFs
  analisePersonalizada: jsonb("analise_personalizada"), // AI-generated analysis
  palavrasChave: text("palavras_chave").array(), // Keywords extracted by AI
  criteriosElegibilidade: text("criterios_elegibilidade").array(), // Eligibility criteria extracted by AI
  processoSelecao: text("processo_selecao"), // Selection process description
  documentosNecessarios: text("documentos_necessarios").array(), // Required documents list
});

// Edital PDFs table for storing uploaded documents
export const editalPdfs = pgTable("edital_pdfs", {
  id: serial("id").primaryKey(),
  editalId: integer("edital_id").references(() => editais.id).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(), // Supabase Storage path
  fileSize: integer("file_size").notNull(), // Size in bytes
  fileType: text("file_type").notNull().default("application/pdf"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  // AI processing fields
  aiProcessed: boolean("ai_processed").default(false),
  extractedContent: text("extracted_content"), // Full text content extracted from PDF
  aiSummary: text("ai_summary"), // AI-generated summary of the PDF content
  processedAt: timestamp("processed_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  chatSessions: many(chatSessions),
  reviews: many(reviews),
  companies: many(productionCompanies),
  editais: many(editais),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  chatSession: one(chatSessions, {
    fields: [projects.id],
    references: [chatSessions.projectId],
  }),
}));

export const productionCompaniesRelations = relations(productionCompanies, ({ one, many }) => ({
  owner: one(users, {
    fields: [productionCompanies.ownerId],
    references: [users.id],
  }),
  projects: many(projects),
  reviews: many(reviews),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [chatSessions.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
  documents: many(documents),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [messages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  session: one(chatSessions, {
    fields: [documents.sessionId],
    references: [chatSessions.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  company: one(productionCompanies, {
    fields: [reviews.companyId],
    references: [productionCompanies.id],
  }),
}));

export const editaisRelations = relations(editais, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [editais.createdBy],
    references: [users.id],
  }),
  pdfs: many(editalPdfs),
}));

export const editalPdfsRelations = relations(editalPdfs, ({ one }) => ({
  edital: one(editais, {
    fields: [editalPdfs.editalId],
    references: [editais.id],
  }),
}));

// Insert schemas for authentication
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertProductionCompanySchema = createInsertSchema(productionCompanies).omit({
  id: true,
  ownerId: true,
  createdAt: true,
  rating: true,
  reviewCount: true,
  verified: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  genre: true,
  status: true,
  budget: true,
  userId: true,
  isPublic: true,
}).partial().required({
  name: true,
  userId: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  userId: true,
  projectId: true,
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  sessionId: true,
  role: true,
  content: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  sessionId: true,
  type: true,
  title: true,
  content: true,
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  userId: true,
  companyId: true,
  rating: true,
  comment: true,
});

export const insertEditalSchema = createInsertSchema(editais).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  analisePersonalizada: true,
  palavrasChave: true,
  criteriosElegibilidade: true,
  processoSelecao: true,
  documentosNecessarios: true,
}).extend({
  prazoInscricao: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  dataResultado: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

export const insertEditalPdfSchema = createInsertSchema(editalPdfs).omit({
  id: true,
  uploadedAt: true,
  aiProcessed: true,
  extractedContent: true,
  aiSummary: true,
  processedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProductionCompany = z.infer<typeof insertProductionCompanySchema>;
export type ProductionCompany = typeof productionCompanies.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertEdital = z.infer<typeof insertEditalSchema>;
export type Edital = typeof editais.$inferSelect;

export type InsertEditalPdf = z.infer<typeof insertEditalPdfSchema>;
export type EditalPdf = typeof editalPdfs.$inferSelect;

// Extended type for production company with owner info
export type ProductionCompanyWithOwner = ProductionCompany & {
  owner?: {
    name: string;
    email: string;
    profileImageUrl: string | null;
  };
};

// Extended type for edital with PDFs and AI analysis
export type EditalWithPdfs = Edital & {
  pdfs: EditalPdf[];
};
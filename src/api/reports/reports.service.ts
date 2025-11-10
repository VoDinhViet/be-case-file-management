import { Inject, Injectable } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { Response } from 'express';
import * as fs from 'fs';
import { DateTime } from 'luxon';
import * as path from 'path';
import PizZip from 'pizzip';
import { DRIZZLE } from '../../database/database.module';
import {
  CasePlanType,
  CaseType,
  SourcePlanType,
  SourceType,
  casesTable,
} from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { RoleEnum } from '../auth/types/role.enum';
import { CasesService } from '../cases/cases.service';
import { SourcesService } from '../sources/sources.service';
import { GetMyCaseStatisticsReqDto } from './dto/get-my-case-statistics.req.dto';

type ReportEntity = {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  crimeType?: string | null;
  applicableLaw?: string | null;
  numberOfDefendants?: string | number | null;
  assignee?: {
    fullName?: string | null;
    phone?: string | null;
  } | null;
};

type ReportPhase = {
  startDate: Date | string;
  endDate: Date | string | null;
  completedAt: Date | string | null;
  tasks?: unknown;
};

type ReportPlan = {
  investigationResult?: unknown;
  exhibits?: unknown;
  nextInvestigationPurpose?: unknown;
  nextInvestigationContent?: unknown;
  participatingForces?: unknown;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  budget?: unknown;
};

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly casesService: CasesService,
    private readonly sourcesService: SourcesService,
  ) {}
  async exportFromTemplate(caseId: string, res: Response) {
    try {
      //----------------------------------------------------------------
      // 1. Lấy thông tin case từ database
      //-----------------------------------------------------------------
      const caseData = await this.casesService.getCaseById(caseId);

      //----------------------------------------------------------------
      // 2. Lấy thông tin phases và plan
      //-----------------------------------------------------------------
      const [casePhases, casePlan] = await Promise.all([
        this.casesService.getPhasesByCaseId(caseId),
        this.casesService.getPlanByCaseId(caseId),
      ]);

      // 3️⃣ Format dữ liệu cho template
      const data = this.formatDataTemplate(
        caseData as CaseType,
        casePhases,
        (casePlan as CasePlanType | undefined) ?? null,
      );

      await this.renderAndSendDocx(data, caseData.name || 'case', res);
    } catch (error) {
      console.error('Lỗi khi xuất template:', error);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Không thể tạo file DOCX từ template',
          details: error.message,
        });
      }
    }
  }

  async exportSourceFromTemplate(sourceId: string, res: Response) {
    try {
      //----------------------------------------------------------------
      // 1. Lấy thông tin source từ database
      //-----------------------------------------------------------------
      const sourceData = await this.sourcesService.getSourceById(sourceId);

      //----------------------------------------------------------------
      // 2. Lấy thông tin phases và plan
      //-----------------------------------------------------------------
      const [sourcePhases, sourcePlan] = await Promise.all([
        this.sourcesService.getPhasesBySourceId(sourceId),
        this.sourcesService.getPlanBySourceId(sourceId),
      ]);

      // 3️⃣ Format dữ liệu cho template
      const data = this.formatDataTemplate(
        sourceData as SourceType,
        sourcePhases,
        (sourcePlan as SourcePlanType | undefined) ?? null,
      );

      await this.renderAndSendDocx(
        data,
        sourceData.name || 'source',
        res,
        'template-source.docx',
      );
    } catch (error) {
      console.error('Lỗi khi xuất template nguồn tin:', error);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Không thể tạo file DOCX từ template nguồn tin',
          details: error.message,
        });
      }
    }
  }

  /**
   * Format dữ liệu entity (case/source) để phù hợp với template docx
   */
  private formatDataTemplate<
    TEntity extends ReportEntity,
    TPhase extends ReportPhase,
    TPlan extends ReportPlan | null,
  >(entity: TEntity, phases: TPhase[], plan: TPlan) {
    // Format ngày tháng
    const toDate = (value: Date | string | null | undefined) => {
      if (!value) return null;
      return value instanceof Date ? value : new Date(value);
    };

    const formatDate = (date: Date | string | null | undefined) => {
      const normalized = toDate(date);
      if (!normalized) return '';
      return DateTime.fromJSDate(normalized)
        .setZone('Asia/Ho_Chi_Minh')
        .toFormat('dd/MM/yyyy');
    };

    const ensureString = (value: unknown) =>
      value === null || value === undefined ? '' : String(value);

    const ensureStringArray = (value: unknown) => {
      if (!Array.isArray(value)) return [];
      return value.map((item) => ensureString(item)).filter((item) => item);
    };

    // Lấy tất cả tasks từ các phases
    const allTasks: string[] = [];
    phases.forEach((phase) => {
      if (Array.isArray(phase.tasks)) {
        phase.tasks.forEach((task) => {
          const text = ensureString(task);
          if (text) {
            allTasks.push(text);
          }
        });
      }
    });

    // Tính startDate và endDate dựa trên phases
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (phases.length > 0) {
      // Sắp xếp phases theo startDate
      const sortedPhases = [...phases].sort(
        (a, b) =>
          toDate(a.startDate)!.getTime() - toDate(b.startDate)!.getTime(),
      );

      // startDate của case = startDate của phase đầu tiên
      startDate = toDate(sortedPhases[0].startDate);

      // endDate của case = endDate hoặc completedAt của phase cuối cùng
      const lastPhase = sortedPhases[sortedPhases.length - 1];
      endDate =
        toDate(lastPhase.completedAt) ?? toDate(lastPhase.endDate) ?? null;
    }

    // Dữ liệu cuối cùng để thay thế trong template
    return {
      // Thông tin cơ bản
      name: ensureString(entity.name),
      description: ensureString(entity.description),
      status: ensureString(entity.status),
      crimeType: ensureString(entity.crimeType),
      applicableLaw: ensureString(entity.applicableLaw),
      numberOfDefendants: ensureString(entity.numberOfDefendants),
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),

      // Thông tin người phụ trách
      fullName: ensureString(entity.assignee?.fullName),
      phone: ensureString(entity.assignee?.phone),

      // Danh sách tasks từ các phases
      tasks: allTasks,

      // Thông tin kế hoạch điều tra (từ case_plans)
      investigationResult: ensureString(plan?.investigationResult),
      exhibits: ensureStringArray(plan?.exhibits),
      nextInvestigationPurpose: ensureString(plan?.nextInvestigationPurpose),
      nextInvestigationContent: ensureStringArray(
        plan?.nextInvestigationContent,
      ),
      participatingForces: ensureStringArray(plan?.participatingForces),

      // Thông tin thời gian và ngân sách từ kế hoạch
      planStartDate: formatDate(plan?.startDate ?? null),
      planEndDate: formatDate(plan?.endDate ?? null),
      budget: ensureString(plan?.budget),
    };
  }

  private async renderAndSendDocx(
    data: Record<string, unknown>,
    entityName: string | null | undefined,
    res: Response,
    preferredTemplate = 'template.docx',
  ) {
    const templatesDir = path.join(
      process.cwd(),
      'src',
      'api',
      'reports',
      'templates',
    );

    const templatePath = path.join(templatesDir, preferredTemplate);
    let content: Buffer;

    try {
      content = await fs.promises.readFile(templatePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (preferredTemplate !== 'template.docx' && err.code === 'ENOENT') {
        const fallbackPath = path.join(templatesDir, 'template.docx');
        content = await fs.promises.readFile(fallbackPath);
      } else {
        throw error;
      }
    }

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const rawName = entityName?.toString().trim() || 'report';
    const sanitizedName = rawName.replace(/[^a-z0-9]/gi, '_') || 'report';
    const fileName = `${sanitizedName}_${DateTime.now().toFormat('yyyyMMdd_HHmmss')}.docx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.send(buffer);
  }

  async caseStatistics(
    reqDto: GetMyCaseStatisticsReqDto,
    userId: string,
    payload: JwtPayloadType,
  ) {
    if (reqDto.startDate) {
      reqDto.startDate = DateTime.fromJSDate(reqDto.startDate)
        .setZone('Asia/Ho_Chi_Minh')
        .startOf('day')
        .toJSDate();
    }
    if (reqDto.endDate) {
      reqDto.endDate = DateTime.fromJSDate(reqDto.endDate)
        .setZone('Asia/Ho_Chi_Minh')
        .endOf('day')
        .toJSDate();
    }
    const [result] = await this.db
      .select({
        pending:
          sql<number>`COALESCE(SUM(CASE WHEN ${casesTable.status} = 'PENDING' THEN 1 ELSE 0 END), 0)`.mapWith(
            Number,
          ),
        inProgress:
          sql<number>`COALESCE(SUM(CASE WHEN ${casesTable.status} = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0)`.mapWith(
            Number,
          ),
        completed:
          sql<number>`COALESCE(SUM(CASE WHEN ${casesTable.status} = 'COMPLETED' THEN 1 ELSE 0 END), 0)`.mapWith(
            Number,
          ),
        onHold:
          sql<number>`COALESCE(SUM(CASE WHEN ${casesTable.status} = 'ON_HOLD' THEN 1 ELSE 0 END), 0)`.mapWith(
            Number,
          ),
        cancelled:
          sql<number>`COALESCE(SUM(CASE WHEN ${casesTable.status} = 'CANCELLED' THEN 1 ELSE 0 END), 0)`.mapWith(
            Number,
          ),
      })
      .from(casesTable)
      .where(
        and(
          ...(userId ? [eq(casesTable.userId, userId)] : []),
          ...(reqDto.startDate
            ? [gte(casesTable.createdAt, reqDto.startDate)]
            : []),
          ...(reqDto.endDate
            ? [lte(casesTable.createdAt, reqDto.endDate)]
            : []),
          ...(payload.role !== RoleEnum.ADMIN
            ? [eq(casesTable.userId, payload.id)]
            : []),
        ),
      );

    return result;
  }
}

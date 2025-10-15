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
  CasePhasesType,
  CasePlanType,
  CaseType,
  casesTable,
} from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { RoleEnum } from '../auth/types/role.enum';
import { CasesService } from '../cases/cases.service';
import { GetMyCaseStatisticsReqDto } from './dto/get-my-case-statistics.req.dto';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly casesService: CasesService,
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
        casePlan as CasePlanType,
      );

      // 4️⃣ Đọc file template
      const templatePath = path.join(
        process.cwd(),
        'src',
        'api',
        'reports',
        'templates',
        'template.docx',
      );

      // 5️⃣ Đọc file
      const content = await fs.promises.readFile(templatePath);

      // 6️⃣ Load template với cấu hình đúng
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 7️⃣ Render
      doc.render(data);

      // 8️⃣ Tạo buffer và gửi response
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      // Tên file xuất bao gồm tên case
      const caseName = (caseData.name || 'case').replace(/[^a-z0-9]/gi, '_');
      const fileName = `${caseName}_${DateTime.now().toFormat('yyyyMMdd_HHmmss')}.docx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      res.send(buffer);
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

  /**
   * Format dữ liệu case để phù hợp với template docx
   */
  private formatDataTemplate(
    caseData: CaseType,
    casePhases: CasePhasesType[],
    casePlan: CasePlanType | null | undefined,
  ) {
    // Format ngày tháng
    const formatDate = (date: Date | null | undefined) => {
      if (!date) return '';
      return DateTime.fromJSDate(new Date(date))
        .setZone('Asia/Ho_Chi_Minh')
        .toFormat('dd/MM/yyyy');
    };

    // Lấy tất cả tasks từ các phases
    const allTasks: string[] = [];
    casePhases.forEach((phase) => {
      if (phase.tasks && Array.isArray(phase.tasks)) {
        allTasks.push(...phase.tasks);
      }
    });

    // Tính startDate và endDate dựa trên phases
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (casePhases.length > 0) {
      // Sắp xếp phases theo startDate
      const sortedPhases = [...casePhases].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

      // startDate của case = startDate của phase đầu tiên
      startDate = sortedPhases[0].startDate;

      // endDate của case = endDate hoặc completedAt của phase cuối cùng
      const lastPhase = sortedPhases[sortedPhases.length - 1];
      endDate = lastPhase.completedAt || lastPhase.endDate;
    }
    console.log(casePlan?.nextInvestigationContent);

    // Dữ liệu cuối cùng để thay thế trong template
    return {
      // Thông tin cơ bản
      name: caseData.name || '',
      description: caseData.description || '',
      status: caseData.status || '',
      crimeType: caseData.crimeType || '',
      applicableLaw: caseData.applicableLaw || '',
      numberOfDefendants: caseData.numberOfDefendants || 0,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),

      // Thông tin người phụ trách
      fullName: caseData.assignee?.fullName || '',
      phone: caseData.assignee?.phone || '',

      // Danh sách tasks từ các phases
      tasks: allTasks,

      // Thông tin kế hoạch điều tra (từ case_plans)
      investigationResult: casePlan?.investigationResult || '',
      exhibits: casePlan?.exhibits || [],
      nextInvestigationPurpose: casePlan?.nextInvestigationPurpose || '',
      nextInvestigationContent: casePlan?.nextInvestigationContent || [],
      participatingForces: casePlan?.participatingForces || [],
    };
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

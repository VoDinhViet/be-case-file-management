import { Inject, Injectable } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { Response } from 'express';
import * as fs from 'fs';
import { DateTime } from 'luxon';
import * as path from 'path';
import PizZip from 'pizzip';
import { DRIZZLE } from '../../database/database.module';
import { casesTable } from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { GetMyCaseStatisticsReqDto } from './dto/get-my-case-statistics.req.dto';

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}
  async exportFromTemplate(res: Response) {
    try {
      // 1️⃣ Đọc file template
      const templatePath = path.join(
        process.cwd(),
        'src',
        'api',
        'reports',
        'templates',
        'ke_hoach_dieu_tra.docx',
      );

      // 2️⃣ Đọc file
      const content = await fs.promises.readFile(templatePath);

      // 3️⃣ Load template với cấu hình đúng
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 4️⃣ Dữ liệu thay thế - sử dụng cú pháp đơn giản
      const data = {
        name: 'Nguyễn Văn A',
        dob: '01/01/1990',
        address: '123 Đường ABC, Quận 1, TP.HCM',
        tasks: [
          'Khám xét khẩn cấp chỗ ở của Lê Văn Tuấn.',
          'Trưng cầu giám định ma túy.',
          'Xác minh phương tiện tại Phòng Cảnh sát giao thông.',
          'Khởi tố vụ án, khởi tố bị can, hỏi cung bị can, lập danh chỉ bản.',
          'Tra cứu nhân thân, lai lịch Lê Văn Tuấn.',
        ],
      };

      // 5️⃣ Render
      doc.render(data);

      // 6️⃣ Tạo buffer và gửi response
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=report.docx');
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

  async caseStatistics(reqDto: GetMyCaseStatisticsReqDto, userId: string) {
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
            ? [gte(casesTable.endDate, reqDto.startDate)]
            : []),
          ...(reqDto.endDate
            ? [lte(casesTable.startDate, reqDto.endDate)]
            : []),
        ),
      );

    return result;
  }
}

import { Injectable } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

@Injectable()
export class ReportsService {
  async exportFromTemplate(res: Response) {
    // 1️⃣ Đọc file template

    const templatePath = path.join(
      process.cwd(),
      'src',
      'api',
      'reports',
      'templates',
      'ke_hoach_dieu_tra.docx',
    );

    const content = fs.readFileSync(templatePath, 'binary');

    // 2️⃣ Load template
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '[[', end: ']]' }, // 👈 dùng ký hiệu khác
    });

    // 3️⃣ Dữ liệu thay thế
    const data = {
      name: 'Nguyễn Văn A',
      dob: '01/01/1990',
      address: '123 Đường ABC, Quận 1, TP.HCM',
    };

    try {
      doc.render(data);
    } catch (error) {
      console.error(error);
      throw new Error('Không thể render template DOCX');
    }

    // 5️⃣ Tạo file buffer DOCX
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });

    // 6️⃣ Gửi về client
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=report.docx');
    res.send(buffer);
  }
}

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import { formatNumber, formatVnd } from "@/lib/format";
import type { TopTemplateStat } from "@/types/admin";
import {
  buildDashboardHref,
  formatIsoDateVi,
  type DashboardRange,
} from "../date-range";
import { fetchTopTemplates } from "../queries";
import { TemplatePreviewThumb } from "./TemplatePreviewThumb";
import styles from "./TopTemplatesSection.module.css";

export async function TopTemplatesSection({ range }: { range: DashboardRange }) {
  let templates: TopTemplateStat[];
  try {
    templates = await fetchTopTemplates(range, 5);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể tải bảng xếp hạng template.";
    return (
      <Card>
        <ErrorState
          title="Không thể tải Top 5 Template"
          message={message}
          retryHref={buildDashboardHref({
            preset: range.preset,
            from: range.from,
            to: range.to,
            granularity: range.granularity,
          })}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className={styles.header}>
        <div>
          <CardTitle>Top 5 Template phổ biến</CardTitle>
          <CardDescription>
            Xếp hạng theo số đơn in không hủy từ {formatIsoDateVi(range.from)} đến{" "}
            {formatIsoDateVi(range.to)}
          </CardDescription>
        </div>

        <Link href="/admin/templates" className={styles.headerLink}>
          <span>Tất cả templates</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="Chưa có dữ liệu template"
          description="Chưa có đơn hàng nào sử dụng template trong khoảng thời gian đã chọn."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Hạng</th>
                <th scope="col">Template</th>
                <th scope="col" className={styles.alignRight}>
                  Số đơn
                </th>
                <th scope="col" className={styles.alignRight}>
                  Doanh thu
                </th>
                <th scope="col" className={styles.alignRight}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((item, idx) => {
                const rank = idx + 1;
                const templateHref = `/admin/templates/${item.template_id}`;
                return (
                  <tr key={item.template_id}>
                    <td className={styles.rankCell}>
                      <span
                        className={`${styles.rankBadge} ${
                          rank <= 3 ? styles.rankBadgeTop : ""
                        }`}
                      >
                        {rank}
                      </span>
                    </td>
                    <td>
                      <Link href={templateHref} className={styles.templateLink}>
                        <TemplatePreviewThumb
                          src={item.preview_url}
                          alt={`Ảnh xem trước ${item.name}`}
                          className={styles.thumb}
                          fallbackClassName={styles.thumbFallback}
                        />
                        <span className={styles.templateName}>{item.name}</span>
                      </Link>
                    </td>
                    <td className={styles.numCell}>
                      {formatNumber(item.order_count)}
                    </td>
                    <td className={`${styles.numCell} ${styles.revenueCell}`}>
                      {formatVnd(item.revenue_vnd)}
                    </td>
                    <td className={styles.numCell}>
                      <Link href={templateHref} className={styles.detailLink}>
                        <span>Chi tiết</span>
                        <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

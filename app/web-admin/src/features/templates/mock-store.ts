import { MOCK_TEMPLATES } from "@/lib/mock-data";
import type { TemplateDetail } from "@/types/admin";

/**
 * In-memory mutable mock store used ONLY when USE_MOCK_ADMIN_DATA=true.
 * Cloned lazily from MOCK_TEMPLATES so interactive CRUD works in local preview mode.
 */
const globalForMock = globalThis as typeof globalThis & {
  __pauseMockTemplates?: TemplateDetail[];
};

function cloneTemplate(tpl: TemplateDetail): TemplateDetail {
  return {
    ...tpl,
    layout_config: {
      ...tpl.layout_config,
      slots: tpl.layout_config.slots.map((slot) => ({ ...slot })),
      texts: tpl.layout_config.texts.map((text) => ({ ...text })),
    },
  };
}

export function getMockTemplatesStore(): TemplateDetail[] {
  if (!globalForMock.__pauseMockTemplates) {
    globalForMock.__pauseMockTemplates = MOCK_TEMPLATES.map(cloneTemplate);
  }
  return globalForMock.__pauseMockTemplates;
}

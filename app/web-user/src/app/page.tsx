import {
  getPublicMembershipTiers,
  getPublicTemplates,
} from "@/lib/catalog-data";
import { HomeExperience } from "@/features/home/HomeExperience";

export const revalidate = 60;

export default async function HomePage() {
  const [templates, tiers] = await Promise.all([
    getPublicTemplates(),
    getPublicMembershipTiers(),
  ]);

  return <HomeExperience templates={templates} tiers={tiers} />;
}

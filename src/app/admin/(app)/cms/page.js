import { requireUser, hasRole } from "@/lib/auth";
import { listInstagramPosts, listReviewsAdmin, listServicesCMS } from "@/lib/clinic";
import CmsManager from "@/components/admin/CmsManager";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Reviews & Website CMS — Physio Castle Admin" };

export default async function CmsPage() {
  const user = await requireUser();
  const [reviews, services, instagram] = await Promise.all([
    listReviewsAdmin(),
    listServicesCMS(),
    listInstagramPosts({ includeInactive: true }),
  ]);

  const canDelete = hasRole(user, "admin");

  return (
    <>
      <PageHeader eyebrow="Content Management" title="Reviews & Website CMS" />

      <div className="adm-body">
        <CmsManager reviews={reviews} services={services} instagram={instagram} canDelete={canDelete} />
      </div>
    </>
  );
}

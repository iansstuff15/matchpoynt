import { site } from '@/config/site'
import { pageTitle } from '@/utils/seo/pageTitle'

interface PageMetaProps {
  title?: string
  description?: string
}

/** Page title and description. React 19 hoists these into <head>. */
export default function PageMeta({ title, description = site.description }: PageMetaProps) {
  const fullTitle = pageTitle(title)
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
    </>
  )
}

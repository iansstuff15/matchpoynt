/** A background photo for the sign-in, sign-up and password pages, loaded from its link. */
export interface AuthPhoto {
  src: string
  alt: string
  /** Which part of the photo stays in view when it's cropped (CSS object-position). */
  focus: string
  credit: {
    author: string
    license: string
    licenseUrl: string
    sourceUrl: string
  }
}

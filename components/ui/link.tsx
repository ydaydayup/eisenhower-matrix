import { forwardRef } from 'react'
import NextLink from 'next/link'
const LinkComponent = forwardRef(({ href, children, ...props }, ref) => {
  return (
    <NextLink href={href} passHref legacyBehavior>
      <a ref={ref} {...props} suppressHydrationWarning>
        {children}
      </a>
    </NextLink>
  )
})
LinkComponent.displayName = 'LinkComponent'
export { LinkComponent } 
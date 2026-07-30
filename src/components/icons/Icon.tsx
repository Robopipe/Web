import { iconData, type IconName } from './data'

type Props = {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 24, className }: Props) {
  const icon = iconData[name]
  return (
    <svg
      viewBox={icon.viewBox}
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  )
}

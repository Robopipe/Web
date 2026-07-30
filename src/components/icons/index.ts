export { Icon } from './Icon'
export { iconData, type IconName } from './data'

import { iconData, type IconName } from './data'

export const iconOptions = (Object.keys(iconData) as IconName[]).map((value) => ({
  label: value.replace(/^Ico/, ''),
  value,
}))

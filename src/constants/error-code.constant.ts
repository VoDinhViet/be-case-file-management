export enum ErrorCode {
  // Common Validation

  CV000 = 'common.validation.is_empty',
  CV001 = 'common.out_time_working',
  CV002 = 'common.validation.is_invalid_lat_lng',

  V000 = 'validation.is_empty',

  U001 = 'user.error.not_found',
  U002 = 'user.error.already_exists',

  // Template
  T001 = 'template.error.not_found',
  T002 = 'template.error.group_not_found',
  T003 = 'template.error.title_already_exists',
}

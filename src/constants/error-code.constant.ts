export enum ErrorCode {
  // Common Validation

  CV000 = 'common.validation.is_empty',
  CV001 = 'common.out_time_working',
  CV002 = 'common.validation.is_invalid_lat_lng',

  V000 = 'validation.is_empty',

  U001 = 'user.error.not_found',
  U002 = 'user.error.already_exists',
  U003 = 'user.error.wrong_password',
  U004 = 'user.error.forbidden',
  U005 = 'user.error.invalid_referral_code',

  // Template
  T001 = 'template.error.not_found',
  T002 = 'template.error.group_not_found',
  T003 = 'template.error.title_already_exists',
  T004 = 'template.error.in_use_by_cases',
  // Case
  C001 = 'case.error.not_found',
  C002 = 'case.error.field_not_found',
  C003 = 'case.error.invalid_status_transition',
  // Phase
  P001 = 'phase.error.not_found',
  // Source
  S001 = 'source.error.not_found',
  S002 = 'source.error.field_not_found',
  S003 = 'source.error.invalid_status_transition',
  // Source Phase
  SP001 = 'source_phase.error.not_found',
}

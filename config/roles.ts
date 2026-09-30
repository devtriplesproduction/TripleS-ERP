export const DEPARTMENTS = [
  { id: 'Content', name: 'Content' },
  { id: 'Development', name: 'Development' },
  { id: 'Management', name: 'Management' }
]

export const DIVISIONS: Record<string, { id: string; name: string }[]> = {
  'Content': [
    { id: 'Marketing', name: 'Marketing' },
    { id: 'Creative', name: 'Creative' }
  ],
  'Development': [
    { id: 'Website Development', name: 'Website Development' },
    { id: 'Software Development', name: 'Software Development' },
    { id: 'App Development', name: 'App Development' }
  ],
  'Management': [
    { id: 'General Management', name: 'General Management' }
  ]
}

export const DESIGNATIONS: Record<string, { id: string; name: string }[]> = {
  'Marketing': [
    { id: 'Digital Marketing Executive', name: 'Digital Marketing Executive' },
    { id: 'SEO Specialist', name: 'SEO Specialist' },
    { id: 'Content Writer', name: 'Content Writer' },
    { id: 'Social Media Executive', name: 'Social Media Executive' }
  ],
  'Creative': [
    { id: 'Video Editor', name: 'Video Editor' },
    { id: 'Graphic Designer', name: 'Graphic Designer' },
    { id: 'Motion Designer', name: 'Motion Designer' },
    { id: 'UI/UX Designer', name: 'UI/UX Designer' }
  ],
  'Website Development': [
    { id: 'WordPress Developer', name: 'WordPress Developer' },
    { id: 'UI/UX Designer', name: 'UI/UX Designer' }
  ],
  'Software Development': [
    { id: 'Full-Stack Developer', name: 'Full-Stack Developer' },
    { id: 'DevOps Engineer', name: 'DevOps Engineer' }
  ],
  'App Development': [
    { id: 'App Developer', name: 'App Developer' },
    { id: 'UI/UX Designer', name: 'UI/UX Designer' },
    { id: 'Frontend Developer', name: 'Frontend Developer' },
    { id: 'Backend Developer', name: 'Backend Developer' },
    { id: 'Tester', name: 'Tester' }
  ],
  'General Management': [
    { id: 'HR', name: 'HR' },
    { id: 'Accountant', name: 'Accountant' },
    { id: 'Sales Executive', name: 'Sales Executive' }
  ]
}

export const ROLES = [
  { id: 'Employee', name: 'Employee' },
  { id: 'Manager', name: 'Manager' }
]

export const HOD_STATUS = [
  { id: 'True', name: 'True' },
  { id: 'False', name: 'False' }
]

export const ROLE_PERMISSIONS = {
  'HOD': [
    'create:tasks',
    'assign:tasks',
    'manage:department',
    'monitor:team',
    'view:department_reports'
  ],
  'Manager': [
    'create:tasks',
    'assign:tasks',
    'monitor:employees',
    'manage:company_operations'
  ],
  'Admin': [
    'manage:erp',
    'manage:users',
    'manage:roles'
  ]
}

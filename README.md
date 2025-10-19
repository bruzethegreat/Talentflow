# TalentFlow

A comprehensive hiring management platform built with modern web technologies. TalentFlow provides a complete solution for managing jobs, candidates, and assessments in a streamlined, user-friendly interface.

## Features 

### Job Management
- **Job Listings**: Browse and manage all job postings with advanced filtering and search
- **Job Details**: View detailed information about each position including applicant statistics
- **Drag & Drop Reordering**: Easily reorder jobs using intuitive drag-and-drop interface
- **CRUD Operations**: Create, read, update, and delete job postings
- **Status Tracking**: Monitor job status (Active, On Hold, Closed)

### Candidate Management
- **Candidate Board**: Visual Kanban board for tracking candidates through hiring stages
  - Applied
  - Screening
  - Interview
  - Offer
  - Hired
  - Rejected
- **Candidate Profiles**: Detailed candidate information with timeline and notes
- **Drag & Drop**: Move candidates between stages effortlessly
- **Search & Filter**: Find candidates by name, email, or job position
- **Notes & Timeline**: Track all interactions and stage changes

### Assessment System
- **Assessment Builder**: Create custom assessments with 6 question types:
  - Single Choice (radio buttons)
  - Multiple Choice (checkboxes)
  - Short Text (single line)
  - Long Text (paragraph)
  - Numeric (with min/max validation)
  - Rating Scale (1-5 stars)
- **Section Organization**: Group questions into logical sections
- **Conditional Logic**: Show/hide questions based on previous answers
- **Preview Mode**: View assessments as candidates would see them
- **Validation Rules**: Required fields, numeric ranges, text length limits
- **Assessment Form**: Candidate-facing form with progress tracking

### Dashboard & Analytics
- **Statistics Overview**: Quick view of jobs, candidates, and assessments
- **Recent Activity**: Track latest candidates and job updates
- **Performance Metrics**: Monitor hiring pipeline efficiency

## Tech Stack

### Frontend Framework
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety throughout the application
- **Vite 5**: Lightning-fast development and optimized production builds

### UI & Styling
- **Tailwind CSS v3**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible component library (New York style)
- **Radix UI**: Unstyled, accessible UI primitives
- **Lucide React**: Beautiful, consistent icon set
- **@dnd-kit**: Modern drag-and-drop toolkit for React

### State Management & Data
- **TanStack Query (React Query)**: Powerful async state management
- **Dexie.js**: IndexedDB wrapper for local data persistence
- **React Hook Form**: Performant form handling with validation

### Development Tools
- **MSW (Mock Service Worker)**: API mocking with realistic network behavior
- **React Router v6**: Type-safe routing with deep linking
- **ESLint**: Code quality and consistency
- **TypeScript**: Static type checking

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bruzethegreat/Talentflow.git
cd talentflow
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit:
```
http://localhost:5173
```

### Building for Production

```bash
npm run build
```

The optimized production build will be created in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
talentflow/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── ...              # Custom components
│   ├── pages/               # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── jobs/
│   │   ├── candidates/ 
│   │   └── assessments/
│   ├── lib/
│   │   ├── db.ts            # IndexedDB setup with Dexie
│   │   └── utils.ts         # Utility functions
│   ├── mocks/
│   │   ├── handlers.ts      # MSW API handlers
│   │   ├── seed.ts          # Seed data generation
│   │   └── browser.ts       # MSW browser setup
│   ├── types/
│   │   └── index.ts         # TypeScript type definitions
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Key Features Explained

### IndexedDB Persistence
All data is stored locally in the browser using IndexedDB, providing:
- Offline functionality
- Fast data access
- No backend required for demo purposes
- Persistent storage across sessions

### Mock Service Worker (MSW)
API requests are intercepted and handled by MSW, providing:
- Realistic network latency (200-1200ms)
- Simulated error scenarios (5-10% failure rate)
- Full REST API simulation
- No backend required

### Drag & Drop
Powered by @dnd-kit for:
- Accessible drag-and-drop
- Touch screen support
- Smooth animations
- Keyboard navigation

### Form Validation
Comprehensive validation including:
- Required field checking
- Numeric range validation
- Text length constraints
- Email format validation
- Real-time error feedback

## API Endpoints (MSW Simulated)

### Jobs
- `GET /api/jobs` - List all jobs with pagination and filtering
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `PUT /api/jobs/reorder` - Reorder jobs

### Candidates
- `GET /api/candidates` - List candidates with filtering
- `GET /api/candidates/:id` - Get candidate details
- `POST /api/candidates` - Create new candidate
- `PUT /api/candidates/:id` - Update candidate
- `PUT /api/candidates/:id/stage` - Update candidate stage

### Assessments
- `GET /api/assessments/:jobId` - Get assessment for job
- `POST /api/assessments` - Create/update assessment
- `POST /api/assessments/:id/submit` - Submit assessment response

### Timeline & Notes
- `GET /api/candidates/:id/timeline` - Get candidate timeline
- `POST /api/candidates/:id/notes` - Add note to candidate

## Database Schema

### Jobs Table
```typescript
{
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  status: "Active" | "On Hold" | "Closed";
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary: { min: number; max: number; currency: string };
  tags: string[];
  order: number;
  openings: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Candidates Table
```typescript
{
  id: string;
  name: string;
  email: string;
  phone: string;
  jobId: string;
  stage: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  resume: string;
  coverLetter: string;
  notes: Note[];
  skills: string[];
  experience: number;
  education: string;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Assessments Table
```typescript
{
  id: string;
  jobId: string;
  title: string;
  description: string;
  sections: Section[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Development Workflow

### Adding New Components
1. Create component file in `src/components/`
2. Import and use in pages
3. Add types in `src/types/index.ts` if needed

### Adding New Routes
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update navigation if needed

### Database Changes
1. Update schema in `src/lib/db.ts`
2. Update types in `src/types/index.ts`
3. Update MSW handlers in `src/mocks/handlers.ts`
4. Update seed data in `src/mocks/seed.ts`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

IndexedDB is required for data persistence.

## Performance

- Code splitting with React lazy loading
- Optimized bundle size with Vite
- Virtual scrolling for large lists
- Debounced search inputs
- Memoized components and callbacks

## Accessibility

- ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Semantic HTML

## Future Enhancements

- [ ] Email notifications
- [ ] Calendar integration
- [ ] Video interview scheduling
- [ ] Resume parsing
- [ ] Advanced analytics
- [ ] Team collaboration
- [ ] Role-based permissions
- [ ] Export to PDF/CSV
- [ ] Integration with ATS systems
- [ ] Mobile application

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or questions, please open an issue on GitHub.

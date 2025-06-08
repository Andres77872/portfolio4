import { useState, useMemo } from 'react';
import projectsData from '../data/projects.json';

interface Project {
  title: string;
  description: string;
  url?: string;
  image?: string;
  tags?: string[];
  status?: 'production' | 'repo';
}

export default function Projects() {
  const projects = projectsData as Project[];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const allTags = useMemo(() => {
    const tags = projects.flatMap(p => p.tags || []);
    return Array.from(new Set(tags)).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTag
        ? p.tags?.includes(selectedTag)
        : true;
      return matchesSearch && matchesTag;
    });
  }, [projects, searchTerm, selectedTag]);

  return (
    <section id="projects" className="section projects">
      <h2>My Projects</h2>

      <div className="project-filters">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select
          value={selectedTag}
          onChange={e => setSelectedTag(e.target.value)}
        >
          <option value="">All Tags</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <div className="cards-container">
        {filteredProjects.map((project, index) => (
          <div key={index} className="card">
            {project.image && (
              <img src={project.image} alt={project.title} />
            )}
            <h3>
              {project.title}
              {project.status && (
                <span className={`status status-${project.status}`}>
                  {project.status}
                </span>
              )}
            </h3>
            <p>{project.description}</p>
            {project.tags && (
              <div className="tags-container">
                {project.tags.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View More
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
import projects from '../data/projects.json';

interface Project {
  title: string;
  description: string;
  link?: string;
}

export default function Projects() {
  return (
    <section id="projects" className="section projects">
      <h2>My Projects</h2>
      <div className="cards-container">
        {projects.map((project: Project, index: number) => (
          <div key={index} className="card">
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            {project.link && (
              <a href={project.link} target="_blank" rel="noopener noreferrer">
                View more
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
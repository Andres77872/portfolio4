import {useMemo, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import projectsData from '../data/projects.json';

interface Project {
    title: string;
    description: string;
    descriptionMD: string;
    url?: string;
    apiUrl?: string;
    repoUrl?: string;
    image?: string;
    tags?: string[];
    status?: 'production' | 'repo';
}

export default function Projects() {
    const projects = projectsData as Project[];
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openProjectModal = (project: Project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    };

    const closeProjectModal = () => {
        setIsModalOpen(false);
        document.body.style.overflow = ''; // Re-enable scrolling
    };

    const allTags = useMemo(() => {
        // Convert all tags to uppercase to avoid duplications due to case sensitivity
        const tags = projects.flatMap(p => p.tags?.map(tag => tag.toUpperCase()) || []);
        return Array.from(new Set(tags)).sort();
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch =
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTag = selectedTag
                ? p.tags?.some(tag => tag.toUpperCase() === selectedTag)
                : true;
            return matchesSearch && matchesTag;
        });
    }, [projects, searchTerm, selectedTag]);

    return (
        <section id="projects" className="section projects">
            <div className="projects__container">
                <h2>My Projects</h2>

                <div className="projects__filters">
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select
                        value={selectedTag}
                        onChange={e => setSelectedTag(e.target.value.toUpperCase())}
                    >
                        <option value="">All Tags</option>
                        {allTags.map(tag => (
                            <option key={tag} value={tag}>
                                {tag}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="projects__cards">
                {filteredProjects.map((project, index) => (
                    <div 
                        key={index} 
                        className={project.url ? 'projects__card--live' : 'projects__card--repo'}
                        onClick={() => openProjectModal(project)}
                    >
                        {project.url && (
                            <div className="projects__live">Live</div>
                        )}
                        {project.status === 'repo' && !project.url && (
                            <div className="projects__repo">Repo</div>
                        )}
                        {project.image && (
                            <img src={project.image} alt={project.title} />
                        )}
                        <h3>
                            {project.title}
                        </h3>
                        <p>{project.description.substring(0, 150)}...</p>
                        {project.tags && (
                            <div className="projects__tags">
                                {project.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className={`projects__tag ${
                                            selectedTag === tag
                                                ? 'projects__tag--active'
                                                : ''
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent card click
                                            setSelectedTag(tag);
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="projects__links">
                            {project.url && (
                                <a
                                    href={project.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} // Prevent card click
                                >
                                    Live Site
                                </a>
                            )}
                            {project.apiUrl && (
                                <a
                                    href={project.apiUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} // Prevent card click
                                >
                                    API
                                </a>
                            )}
                            {project.repoUrl && (
                                <a
                                    href={project.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} // Prevent card click
                                >
                                    GitHub
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            </div>

            {/* Project Modal */}
            {isModalOpen && selectedProject && (
                <div className="project-modal">
                    <div className="project-modal__overlay" onClick={closeProjectModal}></div>
                    <div className="project-modal__content">
                        <button className="project-modal__close" onClick={closeProjectModal}>
                            &times;
                        </button>

                        {selectedProject.image && (
                            <img 
                                src={selectedProject.image} 
                                alt={selectedProject.title} 
                                className="project-modal__image" 
                            />
                        )}

                        <h2 className="project-modal__title">
                            {selectedProject.title}
                        </h2>

                        <div className="project-modal__description">
                            <ReactMarkdown>{selectedProject.descriptionMD}</ReactMarkdown>
                        </div>

                        {selectedProject.tags && (
                            <div className="projects__tags project-modal__tags">
                                {selectedProject.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className={`projects__tag ${
                                            selectedTag === tag
                                                ? 'projects__tag--active'
                                                : ''
                                        }`}
                                        onClick={() => {
                                            setSelectedTag(tag);
                                            closeProjectModal();
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="projects__links project-modal__links">
                            {selectedProject.url && (
                                <a
                                    href={selectedProject.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Live Site
                                </a>
                            )}
                            {selectedProject.apiUrl && (
                                <a
                                    href={selectedProject.apiUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    API
                                </a>
                            )}
                            {selectedProject.repoUrl && (
                                <a
                                    href={selectedProject.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    GitHub
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

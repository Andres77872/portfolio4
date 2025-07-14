import React, { useMemo, useState } from 'react';
import projectsData from '../../data/projects.json';
import { Project } from './types';
import ProjectCard from './ProjectCard';
import ProjectFilters from './ProjectFilters';
import ProjectModal from './ProjectModal';
import '../../css/components/projects/Projects.css';

const Projects: React.FC = () => {
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

    const handleTagClick = (tag: string) => {
        setSelectedTag(tag.toUpperCase());
    };

    // Get all unique tags
    const allTags = useMemo(() => {
        // Convert all tags to uppercase to avoid duplications due to case sensitivity
        const tags = projects.flatMap(p => p.tags?.map(tag => tag.toUpperCase()) || []);
        return Array.from(new Set(tags)).sort();
    }, [projects]);

    // Filter projects based on search term and selected tag
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
                
                <ProjectFilters 
                    searchTerm={searchTerm}
                    selectedTag={selectedTag}
                    allTags={allTags}
                    onSearchChange={setSearchTerm}
                    onTagChange={(tag) => setSelectedTag(tag.toUpperCase())}
                />

                <div className="projects__cards">
                    {filteredProjects.map((project, index) => (
                        <ProjectCard
                            key={index}
                            project={project}
                            onCardClick={openProjectModal}
                        />
                    ))}
                </div>
            </div>

            {selectedProject && (
                <ProjectModal
                    project={selectedProject}
                    isOpen={isModalOpen}
                    onClose={closeProjectModal}
                    onTagClick={handleTagClick}
                    selectedTag={selectedTag}
                />
            )}
        </section>
    );
};

export default Projects;

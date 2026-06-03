import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import projectsData from '../../data/projects.json';
import { Project } from './types';
import ProjectCard from './ProjectCard';
import ProjectFilters from './ProjectFilters';
import ProjectModal from './ProjectModal';
import Section from '../common/Section';
import { useModal } from '../../contexts/ModalContext';

const Projects: React.FC = () => {
    const projects = projectsData as Project[];
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const { isModalOpen, setIsModalOpen } = useModal();

    const openProjectModal = (project: Project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    const closeProjectModal = () => {
        setSelectedProject(null);
        setIsModalOpen(false);
    };

    const handleTagClick = (tag: string) => {
        const tagUpper = tag.toUpperCase();
        setSelectedTags(prev => {
            if (prev.includes(tagUpper)) {
                return prev.filter(t => t !== tagUpper);
            }
            return [...prev, tagUpper];
        });
    };
    
    const clearAllTags = () => {
        setSelectedTags([]);
    };

    const allTags = useMemo(() => {
        const tags = projects.flatMap(p => p.tags?.map(tag => tag.toUpperCase()) || []);
        return Array.from(new Set(tags)).sort();
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch =
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description.toLowerCase().includes(searchTerm.toLowerCase());
                
            const matchesTags = selectedTags.length === 0
                ? true
                : p.tags?.some(tag => selectedTags.includes(tag.toUpperCase()));
                
            return matchesSearch && matchesTags;
        });
    }, [projects, searchTerm, selectedTags]);

    return (
        <Section id="projects" title="My Projects">
            <ProjectFilters 
                searchTerm={searchTerm}
                selectedTags={selectedTags}
                allTags={allTags}
                onSearchChange={setSearchTerm}
                onTagToggle={handleTagClick}
                onClearAllTags={clearAllTags}
            />

            {/* Results info - Modern design */}
            {(searchTerm || selectedTags.length > 0) && (
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-sm font-medium",
                            filteredProjects.length > 0 ? "text-foreground" : "text-muted-foreground",
                        )}>
                            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
                        </span>
                        <span className="text-xs text-muted-foreground">found</span>
                    </div>
                </div>
            )}

            {/* Empty State - Modern design */}
            {filteredProjects.length === 0 && (
                <div className={cn(
                    "flex flex-col items-center justify-center",
                    "py-16 px-6",
                    "rounded-xl",
                    "bg-muted/20 backdrop-blur-sm",
                    "border border-border/40",
                )}>
                    <div className={cn(
                        "flex items-center justify-center",
                        "w-16 h-16 rounded-full",
                        "bg-muted/50 mb-4",
                    )}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16" className="text-muted-foreground/50">
                            <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.793 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                            <path d="M5 6a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 6zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 5 8z"/>
                        </svg>
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-2">
                        No projects found
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                        No projects match your current filters. Try adjusting your search or clearing some tags.
                    </p>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            clearAllTags();
                        }}
                        className={cn(
                            "inline-flex items-center gap-2",
                            "px-4 py-2 rounded-lg",
                            "text-sm font-medium",
                            "bg-primary/10 text-primary",
                            "border border-primary/20",
                            "hover:bg-primary/20 hover:border-primary/30",
                            "transition-all duration-200",
                        )}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                        Reset filters
                    </button>
                </div>
            )}

            {/* Projects Grid - Modern responsive layout */}
            {filteredProjects.length > 0 && (
                <div className={cn(
                    "grid gap-4",
                    "grid-cols-[repeat(auto-fill,minmax(320px,1fr))]",
                    "max-lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]",
                    "max-md:grid-cols-2",
                    "max-xs:grid-cols-1",
                )}>
                    {filteredProjects.map((project, index) => (
                        <ProjectCard
                            key={project.title}
                            project={project}
                            onCardClick={openProjectModal}
                            onTagClick={handleTagClick}
                            selectedTags={selectedTags}
                            index={index}
                        />
                    ))}
                </div>
            )}

            {selectedProject && (
                <ProjectModal
                    project={selectedProject}
                    isOpen={isModalOpen}
                    onClose={closeProjectModal}
                    selectedTags={selectedTags}
                    onTagClick={handleTagClick}
                />
            )}
        </Section>
    );
};

export default Projects;

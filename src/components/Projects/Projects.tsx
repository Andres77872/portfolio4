import React, { useMemo, useState } from 'react';
import { Inbox, RotateCcw } from 'lucide-react';
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

            {/* Empty State */}
            {filteredProjects.length === 0 && (
                <div className={cn(
                    "flex flex-col items-center justify-center",
                    "py-16 px-6",
                    "rounded-xl",
                    "bg-muted/20",
                    "border border-border/40",
                )}>
                    <div className={cn(
                        "flex items-center justify-center",
                        "w-16 h-16 rounded-full",
                        "bg-muted/50 mb-4",
                    )}>
                        <Inbox className="size-8 text-muted-foreground/50" />
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
                            "transition-colors duration-200",
                        )}
                    >
                        <RotateCcw className="size-4" />
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

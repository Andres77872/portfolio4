import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectLinkButtons from './ProjectLinkButtons';
import '../../css/components/projects/ProjectModal.css';
import { Project } from './types';

interface ProjectModalProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    selectedTags: string[];
}

const ProjectModal: React.FC<ProjectModalProps> = ({ 
    project, 
    isOpen, 
    onClose,
    selectedTags
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Handle escape key and focus trap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        closeButtonRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getStatusInfo = (status: string) => {
        if (status === 'production') {
            return { label: 'Production', icon: '🚀' };
        }
        return { label: 'Repository', icon: '📦' };
    };

    const LANGUAGE_COLORS: Record<string, string> = {
        javascript: '#f1e05a',
        typescript: '#3178c6',
        python: '#3572A5',
        rust: '#dea584',
        go: '#00ADD8',
        java: '#b07219',
        kotlin: '#A97BFF',
        swift: '#F05138',
        ruby: '#701516',
        php: '#4F5D95',
        c: '#555555',
        'c++': '#f34b7d',
        'c#': '#178600',
        html: '#e34c26',
        css: '#563d7c',
        shell: '#89e051',
        dart: '#00B4AB',
        r: '#198CE7',
        scala: '#c22d40',
        mysql: '#00758F',
        postgresql: '#336791',
        mongodb: '#47A248',
        graphql: '#E10098',
        react: '#61DAFB',
        vue: '#4FC08D',
        angular: '#DD0031',
    };

    const getLanguageColor = (lang: string): string =>
        LANGUAGE_COLORS[lang.toLowerCase()] ?? 'hsl(0 0% 100% / 0.35)';

    return (
        <div 
            className="project-modal" 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="project-modal__overlay" onClick={onClose} aria-hidden="true"></div>
            
            <article className="project-modal__content" ref={modalRef}>
                {/* Close Button */}
                <button 
                    ref={closeButtonRef}
                    className="project-modal__close" 
                    onClick={onClose}
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                </button>

                {/* Hero Section with Image */}
                <div className="project-modal__hero">
                    <img
                        src={project.image}
                        alt={project.title}
                        className="project-modal__image"
                    />
                    <div className="project-modal__hero-overlay"></div>
                    
                    {/* Status Badge on Hero */}
                    {project.status && (
                        <div className={`project-modal__hero-badge project-modal__hero-badge--${project.status}`}>
                            <span>{getStatusInfo(project.status).icon}</span>
                            {getStatusInfo(project.status).label}
                        </div>
                    )}
                </div>

                {/* Title Section */}
                <header className="project-modal__header">
                    <h2 id="modal-title" className="project-modal__title">
                        {project.title}
                    </h2>
                    
                    {/* Action Buttons */}
                    <div className="project-modal__actions">
                        <ProjectLinkButtons
                            repoUrl={project.repoUrl}
                            apiUrl={project.apiUrl}
                            url={project.url}
                        />
                    </div>
                </header>

                {/* Metadata Grid */}
                <div className="project-modal__metadata">
                    {project.language && project.language.length > 0 && (
                        <div className="project-modal__metadata-card" data-type="languages">
                            <div className="project-modal__metadata-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/>
                                </svg>
                            </div>
                            <div className="project-modal__metadata-content">
                                <span className="project-modal__metadata-label">Languages</span>
                                <div className="project-modal__language-tags">
                                    {project.language.map((lang, index) => (
                                        <span key={index} className="project-modal__language-tag">
                                            <span
                                                className="project-modal__language-dot"
                                                style={{ background: getLanguageColor(lang) }}
                                            />
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {project.license && (
                        <div className="project-modal__metadata-card" data-type="license">
                            <div className="project-modal__metadata-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                                </svg>
                            </div>
                            <div className="project-modal__metadata-content">
                                <span className="project-modal__metadata-label">License</span>
                                <span className="project-modal__metadata-value">{project.license}</span>
                            </div>
                        </div>
                    )}
                    
                    {project.releaseDate && (
                        <div className="project-modal__metadata-card" data-type="released">
                            <div className="project-modal__metadata-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                                </svg>
                            </div>
                            <div className="project-modal__metadata-content">
                                <span className="project-modal__metadata-label">Released</span>
                                <span className="project-modal__metadata-value">{project.releaseDate}</span>
                            </div>
                        </div>
                    )}
                    
                    {project.auth && (
                        <div className="project-modal__metadata-card" data-type="auth">
                            <div className="project-modal__metadata-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                                </svg>
                            </div>
                            <div className="project-modal__metadata-content">
                                <span className="project-modal__metadata-label">Authentication</span>
                                <div className="project-modal__auth-info">
                                    <span className={`project-modal__auth-badge ${project.auth.login ? 'project-modal__auth-badge--active' : 'project-modal__auth-badge--inactive'}`}>
                                        {project.auth.login ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                            </svg>
                                        )}
                                        Login
                                    </span>
                                    <span className={`project-modal__auth-badge ${project.auth.register ? 'project-modal__auth-badge--active' : 'project-modal__auth-badge--inactive'}`}>
                                        {project.auth.register ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                            </svg>
                                        )}
                                        Register
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Description Section */}
                <section className="project-modal__description-section">
                    <div className="project-modal__section-header">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2.5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm0 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm0 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6z"/>
                        </svg>
                        <h3>About This Project</h3>
                    </div>
                    <div className="project-modal__description">
                        <ReactMarkdown>{project.descriptionMD}</ReactMarkdown>
                    </div>
                </section>

                {/* Tags Section */}
                {project.tags && project.tags.length > 0 && (
                    <section className="project-modal__tags-section">
                        <div className="project-modal__section-header">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
                            </svg>
                            <h3>Technologies</h3>
                        </div>
                        <div className="project-modal__tags">
                            {project.tags.map((tag: string) => (
                                <span
                                    key={tag}
                                    className={`project-modal__tag ${
                                        selectedTags.includes(tag.toUpperCase())
                                            ? 'project-modal__tag--selected'
                                            : ''
                                    }`}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </section>
                )}
            </article>
        </div>
    );
};

export default ProjectModal;

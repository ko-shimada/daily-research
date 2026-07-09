import * as React from 'react';
import { useMemo, useState } from 'react';
import styles from './DailyResearch.module.scss';
import { IDailyResearchProps } from './IDailyResearchProps';
import { researchData } from '../data/researchData';

type Project = 'voicebot' | 'chatbot';
type ProjectFilter = 'all' | Project;
type Service = typeof researchData.services[number];
type Update = typeof researchData.updates[number];

const reportBaseUrl = 'https://ko-shimada.github.io/daily-research/';
const hotIcon = '\uD83D\uDD25';
const middleDot = '\u30fb';
const ui = {
  title: '\u30c7\u30a4\u30ea\u30fc\u30ea\u30b5\u30fc\u30c1',
  lead: '\u30dc\u30a4\u30b9\u30dc\u30c3\u30c8\u3068\u30c1\u30e3\u30c3\u30c8\u30dc\u30c3\u30c8\u306b\u95a2\u4fc2\u3059\u308bSaaS\u306e\u30a2\u30c3\u30d7\u30c7\u30fc\u30c8\u3001\u969c\u5bb3\u3001\u30e1\u30f3\u30c6\u30ca\u30f3\u30b9\u3092\u30b5\u30fc\u30d3\u30b9\u5358\u4f4d\u3067\u8aad\u3080\u305f\u3081\u306e\u30db\u30fc\u30e0\u3067\u3059\u3002',
  filterAria: '\u7d5e\u308a\u8fbc\u307f',
  all: '\u3059\u3079\u3066',
  voicebot: '\u30dc\u30a4\u30b9\u30dc\u30c3\u30c8',
  chatbot: '\u30c1\u30e3\u30c3\u30c8\u30dc\u30c3\u30c8',
  searchPlaceholder: 'BigQuery\u3001\u969c\u5bb3\u3001GA \u306a\u3069',
  hotTitle: '\u6848\u4ef6\u76f4\u7d50',
  officialSource: '\u516c\u5f0f\u30bd\u30fc\u30b9',
  fresh: '\u76f4\u8fd13\u65e5\u9593',
  week: '1\u9031\u9593\u4ee5\u5185',
  month: '1\u304b\u6708\u4ee5\u5185',
  older: '\u904e\u53bb',
  shortFresh: '3\u65e5',
  shortWeek: '1\u9031',
  shortMonth: '1\u304b\u6708',
  noUpdates: '\u9078\u629e\u6761\u4ef6\u5185\u306e\u66f4\u65b0\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u516c\u5f0f\u30bd\u30fc\u30b9\u306e\u5230\u9054\u78ba\u8a8d\u5bfe\u8c61\u3067\u3059\u3002',
  sourceLead: '\u516c\u5f0f\u30ea\u30ea\u30fc\u30b9\u30ce\u30fc\u30c8\u3001\u30b9\u30c6\u30fc\u30bf\u30b9\u30da\u30fc\u30b8\u3001\u516c\u5f0f\u30cb\u30e5\u30fc\u30b9\u3092\u63a1\u53d6\u5bfe\u8c61\u306b\u3057\u307e\u3059\u3002',
  reportArchive: '\u65e2\u5b58\u306e\u65e5\u4ed8\u5225\u30ec\u30dd\u30fc\u30c8'
};

const projectLabel = (value: string): string => value === 'voicebot' ? ui.voicebot : ui.chatbot;
const formatDate = (value: string): string => value.split('-').join('.');
const pad = (value: number): string => value < 10 ? '0' + value : String(value);
const todayString = (): string => {
  const now = new Date();
  return [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-');
};
const parseDate = (value: string): Date => {
  const parts = value.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};
const recencyKey = (date: string): 'fresh' | 'week' | 'month' | 'older' => {
  const diff = Math.floor((parseDate(todayString()).getTime() - parseDate(date).getTime()) / 86400000);
  if (diff <= 2) return 'fresh';
  if (diff <= 6) return 'week';
  if (diff <= 30) return 'month';
  return 'older';
};

const DailyResearch: React.FC<IDailyResearchProps> = (props) => {
  const [project, setProject] = useState<ProjectFilter>('all');
  const [since, setSince] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  const normalizedKeyword = keyword.trim().toLowerCase();

  const updatesFor = (serviceId: string): Update[] => researchData.updates
    .filter((update) => update.serviceId === serviceId)
    .filter((update) => !since || update.date >= since)
    .filter((update) => !normalizedKeyword || [update.title, update.summary, update.kind].join(' ').toLowerCase().indexOf(normalizedKeyword) >= 0);

  const isHot = (update: Update): boolean => {
    const hotProjects = (update as Update & { hotProjects?: readonly string[] }).hotProjects || [];
    return Array.isArray(hotProjects) && (project === 'all' || hotProjects.indexOf(project) >= 0);
  };

  const visibleServices = useMemo(() => {
    return researchData.services
      .filter((service) => project === 'all' || (service.projects as readonly string[]).indexOf(project) >= 0)
      .filter((service) => {
        if (!normalizedKeyword) return true;
        const serviceText = [service.name, service.category, service.note].join(' ').toLowerCase();
        return serviceText.indexOf(normalizedKeyword) >= 0 || updatesFor(service.id).length > 0;
      });
  }, [project, since, normalizedKeyword]);

  const clearFilters = (): void => {
    setProject('all');
    setSince('');
    setKeyword('');
  };

  const density = (updates: Update[]): React.ReactNode => {
    if (updates.length === 0) return <em className={styles.zeroCount}>0 updates</em>;
    const counts = updates.reduce((acc, update) => {
      const key = recencyKey(update.date);
      if (key !== 'older') acc[key] += 1;
      return acc;
    }, { fresh: 0, week: 0, month: 0 });
    const hotCount = updates.filter(isHot).length;
    return (
      <em className={styles.updateCounts}>
        {hotCount > 0 && <span className={styles.hotCount}>{hotIcon} {hotCount}</span>}
        <span>{ui.shortFresh} {counts.fresh}</span>
        <span>{ui.shortWeek} {counts.week}</span>
        <span>{ui.shortMonth} {counts.month}</span>
      </em>
    );
  };

  const groupedUpdates = (updates: Update[]): React.ReactNode => {
    const groups = [
      { key: 'fresh', label: ui.fresh },
      { key: 'week', label: ui.week },
      { key: 'month', label: ui.month },
      { key: 'older', label: ui.older }
    ] as const;
    const buckets = updates.reduce<Record<typeof groups[number]['key'], Update[]>>((acc, update) => {
      acc[recencyKey(update.date)].push(update);
      return acc;
    }, { fresh: [], week: [], month: [], older: [] });

    return groups
      .filter((group) => buckets[group.key].length > 0)
      .map((group) => (
        <section className={styles.updateGroup} key={group.key}>
          <h4>{group.label}<span>{buckets[group.key].length}</span></h4>
          {buckets[group.key].map((update) => renderUpdate(update))}
        </section>
      ));
  };

  const renderUpdate = (update: Update): React.ReactNode => (
    <article className={styles.update} key={update.serviceId + update.date + update.title}>
      <div className={styles.updateMeta}>
        <span>{formatDate(update.date)}</span>
        <b>{update.kind}</b>
      </div>
      <h3>{isHot(update) && <span className={styles.hotMark} title={ui.hotTitle}>{hotIcon}</span>}{update.title}</h3>
      <p>{update.summary}</p>
      <a href={update.source} target="_blank" rel="noreferrer">{ui.officialSource}</a>
    </article>
  );

  const latest = researchData.reports[0];
  const featured = researchData.updates[0];

  return (
    <section className={styles.dailyResearch + ' ' + (props.isTeamsHost ? styles.teamsHost : '')}>
      <header className={styles.masthead}>
        <div className={styles.kicker}>Daily SaaS Intelligence</div>
        <h1>{ui.title}</h1>
        <p>{ui.lead}</p>
      </header>

      <div className={styles.controls} aria-label={ui.filterAria}>
        <label>
          <span>Project</span>
          <select value={project} onChange={(event) => setProject(event.currentTarget.value as ProjectFilter)}>
            <option value="all">{ui.all}</option>
            <option value="voicebot">{ui.voicebot}</option>
            <option value="chatbot">{ui.chatbot}</option>
          </select>
        </label>
        <label>
          <span>Since</span>
          <input type="date" value={since} onChange={(event) => setSince(event.currentTarget.value)} />
        </label>
        <label className={styles.searchControl}>
          <span>Search</span>
          <input type="search" placeholder={ui.searchPlaceholder} value={keyword} onChange={(event) => setKeyword(event.currentTarget.value)} />
        </label>
        <button type="button" onClick={clearFilters}>Clear</button>
      </div>

      <div className={styles.leadGrid}>
        <article className={styles.feature}>
          <div className={styles.kicker}>Latest Signal</div>
          <h2>{isHot(featured) && <span className={styles.hotMark} title={ui.hotTitle}>{hotIcon}</span>}{featured.title}</h2>
          <p>{featured.summary}</p>
          <div className={styles.featureMeta}>
            <span>{formatDate(featured.date)}</span>
            <span>{featured.kind}</span>
            <a href={featured.source} target="_blank" rel="noreferrer">{ui.officialSource}</a>
          </div>
        </article>
        <aside className={styles.monitor}>
          <h2>Monitor</h2>
          <div><span>Services</span><strong>{researchData.services.length}</strong></div>
          <div><span>Updates</span><strong>{researchData.updates.length}</strong></div>
          <div><span>Latest</span><strong>{latest ? formatDate(latest.date) : '-'}</strong></div>
        </aside>
      </div>

      <main className={styles.layout}>
        <section>
          <div className={styles.sectionTitle}>
            <h2>Services</h2>
            <span>{visibleServices.length} services</span>
          </div>
          <div className={styles.serviceList}>
            {visibleServices.map((service: Service) => {
              const serviceUpdates = updatesFor(service.id);
              return (
                <details className={styles.service} key={service.id}>
                  <summary>
                    <span>
                      <strong>{service.name}</strong>
                      <small>{service.category} / {service.projects.map(projectLabel).join(middleDot)}</small>
                    </span>
                    {density(serviceUpdates)}
                  </summary>
                  <div className={styles.serviceBody}>
                    <p>{service.note}</p>
                    {serviceUpdates.length > 0 ? groupedUpdates(serviceUpdates) : <p className={styles.empty}>{ui.noUpdates}</p>}
                    <div className={styles.links}>
                      {service.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <aside className={styles.sources}>
          <h2>Official Sources</h2>
          <p>{ui.sourceLead}</p>
          {visibleServices.map((service) => (
            <details key={service.id}>
              <summary>{service.name}</summary>
              {service.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}
            </details>
          ))}
        </aside>
      </main>

      <section className={styles.archive}>
        <div className={styles.sectionTitle}>
          <h2>Reports by Date</h2>
          <span>{ui.reportArchive}</span>
        </div>
        <div className={styles.archiveList}>
          {researchData.reports.map((report) => (
            <a key={report.href} href={reportBaseUrl + report.href} target="_blank" rel="noreferrer">
              <strong>{formatDate(report.date)}</strong>
              <span>{report.summary}</span>
            </a>
          ))}
        </div>
      </section>
    </section>
  );
};

export default DailyResearch;

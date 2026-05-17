// RoadmapBoard — React Native primitives only. CLAUDE.md §4.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors } from '../tokens/colors';

export interface RoadmapTask {
  id: string;
  phase: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  regulatory_basis: string;
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  is_locked: boolean;
  due_date?: string;
}

export interface RoadmapBoardProps {
  tasks: RoadmapTask[];
  onTaskPress?: (task: RoadmapTask) => void;
}

const PHASE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Phase 1 — Foundation',
  2: 'Phase 2 — AML/KYC Infrastructure',
  3: 'Phase 3 — Regulatory Engagement',
  4: 'Phase 4 — Full Registration',
};

type StatusIcon = { icon: string; color: string };

const STATUS_ICONS: Record<RoadmapTask['status'], StatusIcon> = {
  complete: { icon: '✓', color: colors.statusGood },
  in_progress: { icon: '⏳', color: colors.klarifyGold },
  not_started: { icon: '○', color: colors.borderGrey },
  blocked: { icon: '✗', color: colors.statusCritical },
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  phaseSection: {
    marginBottom: 24,
  },
  phaseHeader: {
    backgroundColor: colors.klarifyNavy,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  phaseHeaderText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderGrey,
    padding: 14,
    marginBottom: 8,
  },
  taskCardLocked: {
    backgroundColor: colors.bgGrey,
    opacity: 0.8,
  },
  taskHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
  },
  statusIconWrapper: {
    marginRight: 10,
    marginTop: 1,
  },
  statusIconText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  lockIcon: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
  },
  regulatoryBasis: {
    fontSize: 11,
    color: colors.klarifyTeal,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  dueDateText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
});

function TaskCard({
  task,
  onPress,
}: {
  task: RoadmapTask;
  onPress?: (t: RoadmapTask) => void;
}): React.JSX.Element {
  const statusInfo = STATUS_ICONS[task.status];

  const cardContent = (
    <View style={[styles.taskCard, task.is_locked ? styles.taskCardLocked : undefined]}>
      <View style={styles.taskHeader}>
        <View style={styles.statusIconWrapper}>
          <Text style={[styles.statusIconText, { color: statusInfo.color }]}>
            {statusInfo.icon}
          </Text>
        </View>
        <View style={styles.taskContent}>
          <View style={styles.taskTitleRow}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            {task.is_locked ? <Text style={styles.lockIcon}>🔒</Text> : null}
          </View>
          <Text style={styles.regulatoryBasis}>{task.regulatory_basis}</Text>
          {task.due_date !== undefined ? (
            <Text style={styles.dueDateText}>Due: {task.due_date}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (onPress !== undefined && !task.is_locked) {
    return (
      <Pressable onPress={() => onPress(task)}>
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

export function RoadmapBoard({
  tasks,
  onTaskPress,
}: RoadmapBoardProps): React.JSX.Element {
  const phases: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      {phases.map((phase) => {
        const phaseTasks = tasks.filter((t) => t.phase === phase);
        if (phaseTasks.length === 0) return null;
        return (
          <View key={phase} style={styles.phaseSection}>
            <View style={styles.phaseHeader}>
              <Text style={styles.phaseHeaderText}>{PHASE_LABELS[phase]}</Text>
            </View>
            {phaseTasks.map((task) => (
              <TaskCard key={task.id} task={task} onPress={onTaskPress} />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

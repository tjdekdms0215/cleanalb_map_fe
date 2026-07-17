export const REVIEW_INDICATORS = [
    {
        id: 'NO_CONTRACT',
        apiValue: 'CONTRACT',
        label: '근로계약서 미작성',
        positiveLabel: '근로계약서 작성',
        requestKey: 'contractViolation',
        aliases: [
            '근로계약서작성',
            '계약서',
            'CONTRACT',
            'CONTRACT_VIOLATION',
            'CONTRACTVIOLATION'
        ]
    },
    {
        id: 'MINIMUM_WAGE',
        apiValue: 'MINIMUM_WAGE',
        label: '최저시급 미준수',
        positiveLabel: '최저시급 준수',
        requestKey: 'minimumWageViolation',
        aliases: [
            '최저임금',
            '시급',
            'MINIMUM_WAGE',
            'MINIMUMWAGE',
            'MINIMUMWAGEVIOLATION'
        ]
    },
    {
        id: 'WEEKLY_ALLOWANCE',
        apiValue: 'WEEKLY_ALLOWANCE',
        label: '주휴수당 미지급',
        positiveLabel: '주휴수당 지급',
        requestKey: 'weeklyHolidayAllowanceViolation',
        aliases: [
            '주휴수당',
            'WEEKLY_ALLOWANCE',
            'WEEKLYHOLIDAYALLOWANCE',
            'WEEKLY_HOLIDAY_ALLOWANCE',
            'WEEKLYHOLIDAYALLOWANCEVIOLATION'
        ]
    },
    {
        id: 'BREAK_TIME',
        apiValue: 'BREAK_TIME',
        label: '휴게시간 부족',
        positiveLabel: '법정 휴게시간 보장',
        requestKey: 'breakTimeViolation',
        aliases: [
            '휴게시간',
            '휴게시간부족',
            '법정휴게시간',
            '법정 휴게시간 미보장',
            'BREAK_TIME',
            'BREAKTIME',
            'BREAKTIMEVIOLATION'
        ]
    },
    {
        id: 'PAY_DELAY',
        apiValue: 'PAY_DELAY',
        label: '급여 지급 지연',
        positiveLabel: '급여 지급 일정 준수',
        requestKey: 'wageDelayViolation',
        aliases: [
            '임금체불',
            '급여지연',
            'WAGE_DELAY',
            'PAY_DELAY',
            'WAGEDELAYVIOLATION'
        ]
    },
    {
        id: 'SCHEDULE_CHANGE',
        apiValue: 'SCHEDULE_CHANGE',
        label: '사전 협의 없는 스케줄 변경',
        positiveLabel: '사전 협의 후 스케줄 변경',
        requestKey: 'scheduleChangeViolation',
        aliases: [
            '스케줄변경',
            '사전협의없는스케줄변경',
            '사전 협의 없는 스케줄 변경',
            'SCHEDULE_CHANGE',
            'SCHEDULECHANGE',
            'SCHEDULECHANGEVIOLATION'
        ]
    },
    {
        id: 'SUBSTITUTE_DEMAND',
        apiValue: 'SUBSTITUTE_COERCION',
        label: '반복적이고 지속적인 대타요구 및 강요',
        positiveLabel: '무리한 대타 요구 없음',
        requestKey: 'substituteDemandViolation',
        aliases: [
            '대타요구',
            '대타강요',
            '반복적이고지속적인대타요구및강요',
            '반복적이고 지속적인 대타요구 및 강요',
            'SUBSTITUTE_DEMAND',
            'SUBSTITUTEDEMAND',
            'SUBSTITUTE_COERCION',
            'SUBSTITUTECOERCION',
            'SUBSTITUTEDEMANDVIOLATION',
            'SUBSTITUTEPRESSUREVIOLATION'
        ]
    },
    {
        id: 'OVERTIME_PAY',
        apiValue: 'OVERTIME_PAY',
        label: '초과근무 급여 미지급',
        positiveLabel: '초과근무 급여 지급',
        requestKey: 'overtimePayViolation',
        aliases: [
            '초과근무',
            '야근수당',
            'OVERTIME_PAY',
            'OVERTIMEPAY',
            'OVERTIMEPAYVIOLATION'
        ]
    }
];

export const REVIEW_FORM_INDICATORS = REVIEW_INDICATORS;

export const normalizeIndicatorKey = (value = '') =>
    String(value)
        .trim()
        .toUpperCase()
        .replace(/[^0-9A-Z가-힣]/g, '');

const isTruthyFlag = (value) =>
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true' ||
    value === 'TRUE' ||
    value === 'Y';

export const findReviewIndicator = (value) => {
    const normalizedValue = normalizeIndicatorKey(value);

    if (!normalizedValue) {
        return null;
    }

    return (
        REVIEW_INDICATORS.find((item) => {
            const candidates = [
                item.id,
                item.label,
                item.positiveLabel,
                item.requestKey,
                ...(item.aliases || [])
            ];

            return candidates.some(
                (candidate) =>
                    normalizeIndicatorKey(candidate) ===
                    normalizedValue
            );
        }) || null
    );
};

export const getViolationIndicatorIds = (
    source = {}
) => {
    const explicitValue =
        source?.violationItems ||
        source?.indicatorIds ||
        source?.tags ||
        null;

    if (Array.isArray(explicitValue)) {
        return Array.from(
            new Set(
                explicitValue
                    .map((value) => findReviewIndicator(value)?.id)
                    .filter(Boolean)
            )
        );
    }

    if (
        typeof explicitValue === 'string' &&
        explicitValue.trim()
    ) {
        return Array.from(
            new Set(
                explicitValue
                    .split(',')
                    .map((value) => findReviewIndicator(value)?.id)
                    .filter(Boolean)
            )
        );
    }

    return REVIEW_INDICATORS.filter((indicator) =>
        isTruthyFlag(
            source?.[indicator.requestKey] ??
                source?.[`${indicator.requestKey}Boolean`]
        )
    ).map((indicator) => indicator.id);
};

export const buildReviewRequestPayload = ({
    selectedIndicatorIds = [],
    coworkerCount = null,
    content = '',
    dayType = '',
    timeSlot = ''
}) => {
    const selectedSet = new Set(selectedIndicatorIds);
    const payload = REVIEW_INDICATORS.reduce(
        (accumulator, indicator) => ({
            ...accumulator,
            [indicator.requestKey]:
                selectedSet.has(indicator.id)
        }),
        {}
    );

    if (Number.isInteger(coworkerCount) && coworkerCount >= 0) {
        payload.coworkerCount = coworkerCount;
    }

    if (typeof dayType === 'string' && dayType.trim()) {
        payload.dayType = dayType.trim();
    }

    if (
        typeof timeSlot === 'string' &&
        timeSlot.trim()
    ) {
        payload.timeSlot = timeSlot.trim();
    }

    payload.content =
        typeof content === 'string'
            ? content.trim()
            : '';

    return payload;
};

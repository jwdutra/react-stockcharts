import { slidingWindow, zipper } from "@jwdutra/core";
import { timeFormat as d3TimeFormat, timeFormatDefaultLocale } from "d3-time-format";
import financeDiscontinuousScale from "./financeDiscontinuousScale";
import { defaultFormatters, levelDefinition, IFormatters } from "./levels";
import { format as formatTz, toZonedTime } from "date-fns-tz";

const convertD3FormatToDateFns = (d3Format: string): string => {
    return d3Format
        .replace("%Y", "yyyy") // Year
        .replace("%y", "yy") // 2-digit year
        .replace("%B", "MMMM") // Full month name
        .replace("%b", "MMM") // Abbreviated month name
        .replace("%m", "MM") // Month number
        .replace("%d", "dd") // Day of month
        .replace("%e", "d") // Day of month (no leading zero)
        .replace("%H", "HH") // Hour (24-hour)
        .replace("%I", "hh") // Hour (12-hour)
        .replace("%M", "mm") // Minutes
        .replace("%S", "ss") // Seconds
        .replace("%L", "SSS") // Milliseconds
        .replace("%p", "a") // AM/PM
        .replace("%A", "EEEE") // Full day name
        .replace("%a", "EEE") // Abbreviated day name
        .replace("%w", "e") // Day of week (numeric)
        .replace("%j", "DDD") // Day of year
        .replace("%U", "ww") // Week number
        .replace("%W", "ww"); // Week number
};

const evaluateLevel = (row: any, date: Date, i: number, formatters: IFormatters) => {
    return levelDefinition
        .map((eachLevel, idx) => {
            return {
                level: levelDefinition.length - idx - 1,

                // @ts-ignore
                format: formatters[eachLevel(row, date, i)],
            };
        })
        .find((level) => !!level.format);
};

const discontinuousIndexCalculator = slidingWindow()
    .windowSize(2)
    .undefinedValue(
        (d: Date, idx: number, { initialIndex, formatters }: { initialIndex: number; formatters: IFormatters }) => {
            const i = initialIndex;
            const row = {
                date: d.getTime(),
                startOfSecond: false,
                startOf5Seconds: false,
                startOf15Seconds: false,
                startOf30Seconds: false,
                startOfMinute: false,
                startOf5Minutes: false,
                startOf15Minutes: false,
                startOf30Minutes: false,
                startOfHour: false,
                startOfEighthOfADay: false,
                startOfQuarterDay: false,
                startOfHalfDay: false,
                startOfDay: true,
                startOfWeek: false,
                startOfMonth: false,
                startOfQuarter: false,
                startOfYear: false,
            };

            const level = evaluateLevel(row, d, i, formatters);

            return { ...row, index: i, ...level };
        },
    );

const discontinuousIndexCalculatorLocalTime = discontinuousIndexCalculator.accumulator(
    (
        [prevDate, nowDate]: [Date, Date],
        i: number,
        idx: number,
        { initialIndex, formatters }: { initialIndex: number; formatters: IFormatters },
    ) => {
        const nowSeconds = nowDate.getSeconds();
        const nowMinutes = nowDate.getMinutes();
        const nowHours = nowDate.getHours();
        const nowDay = nowDate.getDay();
        const nowMonth = nowDate.getMonth();

        const startOfSecond = nowSeconds !== prevDate.getSeconds();
        const startOf5Seconds = startOfSecond && nowSeconds % 5 === 0;
        const startOf15Seconds = startOfSecond && nowSeconds % 15 === 0;
        const startOf30Seconds = startOfSecond && nowSeconds % 30 === 0;

        const startOfMinute = nowMinutes !== prevDate.getMinutes();
        const startOf5Minutes = startOfMinute && nowMinutes % 5 <= prevDate.getMinutes() % 5;
        const startOf15Minutes = startOfMinute && nowMinutes % 15 <= prevDate.getMinutes() % 15;
        const startOf30Minutes = startOfMinute && nowMinutes % 30 <= prevDate.getMinutes() % 30;

        const startOfHour = nowHours !== prevDate.getHours();

        const startOfEighthOfADay = startOfHour && nowHours % 3 === 0;
        const startOfQuarterDay = startOfHour && nowHours % 6 === 0;
        const startOfHalfDay = startOfHour && nowHours % 12 === 0;

        const startOfDay = nowDay !== prevDate.getDay();
        // According to ISO calendar
        // Sunday = 0, Monday = 1, ... Saturday = 6
        // day of week of today < day of week of yesterday then today is start of week
        const startOfWeek = nowDay < prevDate.getDay();
        // month of today != month of yesterday then today is start of month
        const startOfMonth = nowMonth !== prevDate.getMonth();
        // if start of month and month % 3 === 0 then it is start of quarter
        const startOfQuarter = startOfMonth && nowMonth % 3 <= prevDate.getMonth() % 3;
        // year of today != year of yesterday then today is start of year
        const startOfYear = nowDate.getFullYear() !== prevDate.getFullYear();

        const row = {
            date: nowDate.getTime(),
            startOfSecond,
            startOf5Seconds,
            startOf15Seconds,
            startOf30Seconds,
            startOfMinute,
            startOf5Minutes,
            startOf15Minutes,
            startOf30Minutes,
            startOfHour,
            startOfEighthOfADay,
            startOfQuarterDay,
            startOfHalfDay,
            startOfDay,
            startOfWeek,
            startOfMonth,
            startOfQuarter,
            startOfYear,
        };

        const level = evaluateLevel(row, nowDate, i, formatters);

        return { ...row, index: i + initialIndex, ...level };
    },
);

function createIndex(realDateAccessor: any, inputDateAccessor: any, initialIndex: number, formatters: IFormatters) {
    return function (data: any[]) {
        const dateAccessor = realDateAccessor(inputDateAccessor);

        const calculate = discontinuousIndexCalculatorLocalTime.source(dateAccessor).misc({ initialIndex, formatters });

        const index = calculate(data).map((each) => {
            const { format: formatString } = each;

            const dateObj = new Date(each.date);

            const validDate = isNaN(dateObj.getTime()) ? new Date(0) : dateObj;

            return {
                index: each.index,
                level: each.level,
                date: validDate,
                format: formatString,

                formatFunction: (date: Date, timezone?: string) => {
                    if (!date || isNaN(date.getTime())) {
                        return "";
                    }

                    if (timezone && typeof timezone === "string" && timezone.trim() !== "") {
                        try {
                            const zonedDate = toZonedTime(date, timezone);

                            const dateFnsFormat = convertD3FormatToDateFns(formatString);
                            return formatTz(zonedDate, dateFnsFormat, { timeZone: timezone });
                        } catch (error) {
                            return d3TimeFormat(formatString)(date);
                        }
                    }
                    return d3TimeFormat(formatString)(date);
                },
            };
        });

        return { index };
    };
}

export interface DiscontinuousTimeScaleProviderBuilder {
    (data: any[]): {
        data: any[];
        xScale: any;
        xAccessor: (data: any) => number;
        displayXAccessor: (data: any) => number;
    };
    initialIndex(): any;
    initialIndex(x: any): DiscontinuousTimeScaleProviderBuilder;
    inputDateAccessor(): any;
    inputDateAccessor(accessor: (data: any) => Date): DiscontinuousTimeScaleProviderBuilder;
    indexAccessor(): any;
    indexAccessor(x: any): DiscontinuousTimeScaleProviderBuilder;
    indexMutator(): any;
    indexMutator(x: any): DiscontinuousTimeScaleProviderBuilder;
    withIndex(): any;
    withIndex(x: any): DiscontinuousTimeScaleProviderBuilder;
    utc(): DiscontinuousTimeScaleProviderBuilder;
    setLocale(locale?: any, formatters?: IFormatters): DiscontinuousTimeScaleProviderBuilder;
    indexCalculator(): any;
}

export function discontinuousTimeScaleProviderBuilder() {
    let initialIndex = 0;
    let realDateAccessor = (d: any) => d;
    let inputDateAccessor = (d: any) => d.date;
    let indexAccessor = (d: any) => d.idx;
    let indexMutator = (d: any, idx: any) => ({ ...d, idx });
    let withIndex: any;

    let currentFormatters = defaultFormatters;

    const discontinuousTimeScaleProvider = function (data: any[]) {
        let index = withIndex;

        if (index === undefined) {
            const response = createIndex(realDateAccessor, inputDateAccessor, initialIndex, currentFormatters)(data);

            index = response.index;
        }

        const inputIndex = index;

        const xScale = financeDiscontinuousScale(inputIndex);

        const mergedData = zipper().combine(indexMutator);

        const finalData = mergedData(data, inputIndex);

        return {
            data: finalData,
            xScale,
            xAccessor: (d: any) => d && indexAccessor(d)?.index,
            displayXAccessor: realDateAccessor(inputDateAccessor),
        };
    };

    discontinuousTimeScaleProvider.initialIndex = function (x: any) {
        if (!arguments.length) {
            return initialIndex;
        }
        initialIndex = x;
        return discontinuousTimeScaleProvider;
    };
    discontinuousTimeScaleProvider.inputDateAccessor = function (x: any) {
        if (!arguments.length) {
            return inputDateAccessor;
        }
        inputDateAccessor = x;
        return discontinuousTimeScaleProvider;
    };
    discontinuousTimeScaleProvider.indexAccessor = function (x: any) {
        if (!arguments.length) {
            return indexAccessor;
        }
        indexAccessor = x;
        return discontinuousTimeScaleProvider;
    };
    discontinuousTimeScaleProvider.indexMutator = function (x: any) {
        if (!arguments.length) {
            return indexMutator;
        }
        indexMutator = x;
        return discontinuousTimeScaleProvider;
    };
    discontinuousTimeScaleProvider.withIndex = function (x: any) {
        if (!arguments.length) {
            return withIndex;
        }
        withIndex = x;
        return discontinuousTimeScaleProvider;
    };
    discontinuousTimeScaleProvider.utc = () => {
        realDateAccessor = (dateAccessor) => (d: any) => {
            const date = dateAccessor(d);

            const offsetInMillis = date.getTimezoneOffset() * 60 * 1000;
            return new Date(date.getTime() + offsetInMillis);
        };

        return discontinuousTimeScaleProvider;
    };
    discontinuousTimeScaleProvider.setLocale = (locale?: any, formatters?: IFormatters) => {
        if (locale !== undefined) {
            timeFormatDefaultLocale(locale);
        }
        if (formatters !== undefined) {
            currentFormatters = formatters;
        }

        return discontinuousTimeScaleProvider;
    };

    discontinuousTimeScaleProvider.indexCalculator = function () {
        return createIndex(realDateAccessor, inputDateAccessor, initialIndex, currentFormatters);
    };

    return discontinuousTimeScaleProvider as DiscontinuousTimeScaleProviderBuilder;
}

export default discontinuousTimeScaleProviderBuilder();

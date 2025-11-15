import * as React from "react";
import {
    Chart,
    ChartCanvas,
    XAxis,
    YAxis,
    CandlestickSeries,
    discontinuousTimeScaleProviderBuilder,
    withDeviceRatio,
    withSize,
} from "react-stockcharts3";

interface IOHLCData {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface TimezoneDiscontinuousExampleProps {
    readonly height?: number;
    readonly width?: number;
    readonly ratio?: number;
    readonly timezone?: string;
}

// Generate intraday data (every 30 minutes for one trading day)
const generateIntradayData = (): IOHLCData[] => {
    const data: IOHLCData[] = [];
    const baseDate = new Date("2024-01-15T09:30:00Z"); // Market open at 9:30 AM UTC
    let price = 100;

    for (let i = 0; i < 14; i++) {
        // 14 candles = 7 hours of trading (9:30 AM - 4:30 PM)
        const date = new Date(baseDate.getTime() + i * 30 * 60 * 1000); // Every 30 minutes
        const open = price;
        const change = (Math.random() - 0.5) * 2;
        const close = price + change;
        const high = Math.max(open, close) + Math.random();
        const low = Math.min(open, close) - Math.random();
        const volume = Math.floor(Math.random() * 1000000) + 500000;

        data.push({
            date,
            open,
            high,
            low,
            close,
            volume,
        });

        price = close;
    }

    return data;
};

class TimezoneDiscontinuousExampleBase extends React.Component<TimezoneDiscontinuousExampleProps> {
    private readonly rawData = generateIntradayData();
    private readonly margin = { left: 0, right: 48, top: 0, bottom: 24 };

    public render() {
        const { height = 400, ratio = 1, width = 800, timezone } = this.props;

        const xScaleProvider = discontinuousTimeScaleProviderBuilder().inputDateAccessor((d: IOHLCData) => d.date);

        const { data, xScale, xAccessor, displayXAccessor } = xScaleProvider(this.rawData);

        const xExtents = [xAccessor(data[0]), xAccessor(data[data.length - 1])];

        return (
            <ChartCanvas
                height={height}
                ratio={ratio}
                width={width}
                margin={this.margin}
                data={data}
                seriesName="Intraday"
                xScale={xScale}
                xAccessor={xAccessor}
                displayXAccessor={displayXAccessor}
                xExtents={xExtents}
            >
                <Chart id={1} yExtents={this.yExtents}>
                    <CandlestickSeries />
                    <XAxis timezone={timezone} />
                    <YAxis />
                </Chart>
            </ChartCanvas>
        );
    }

    private readonly yExtents = (data: IOHLCData) => {
        return [data.high, data.low];
    };
}

export const TimezoneDiscontinuousExample = withSize({ style: { minHeight: 600 } })(
    withDeviceRatio()(TimezoneDiscontinuousExampleBase),
);

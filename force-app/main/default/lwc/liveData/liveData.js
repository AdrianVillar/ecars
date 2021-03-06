import { LightningElement, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { chartConfig } from './chartConfig';
import chartjs from '@salesforce/resourceUrl/chart';

export default class LiveData extends LightningElement {
    @track chartJsConfig = chartConfig;
    @track wsData = [];
    buttonLabel = 'Pause';
    chart;
    error;
    firstCar;

    _isInitialized = false;
    _updateChart = true;

    renderedCallback() {
        if (this._isInitialized) {
            return;
        }
        this._isInitialized = true;

        loadScript(this, chartjs)
            .then(() => {
                const canvas = document.createElement('canvas');
                this.template.querySelector('div.chart').appendChild(canvas);
                const ctx = canvas.getContext('2d');
                this.chart = new window.Chart(ctx, this.chartJsConfig);
                const ws = new window.WebSocket('wss://example.herokuapp.com');
                const that = this;
                // For the simplicity of this demo we are just listening to the
                // first car that sends its telemetry data.
                //
                // In an upcoming iteration of eCars this will be enhanced by
                // specifying a car from Postgres in combination with
                ws.onmessage = function (event) {
                    if (!that._updateChart) return;
                    const wsElement = JSON.parse(JSON.parse(event.data));
                    if (!that.firstCar) that.firstCar = wsElement.name;
                    if (wsElement.name === that.firstCar) {
                        that.wsData.push(wsElement);
                        that.chart.data.datasets[0].data.push(wsElement.mpge);
                        that.chart.data.datasets[1].data.push(
                            wsElement.battery
                        );
                        that.chart.data.datasets[2].data.push(wsElement.range);
                        if (that.chart.data.datasets[0].data.length > 10) {
                            that.chart.data.datasets[0].data.splice(0, 1);
                            that.chart.data.datasets[1].data.splice(0, 1);
                            that.chart.data.datasets[2].data.splice(0, 1);
                        }
                        that.chart.update();
                    }
                };
            })
            .catch((error) => {
                this.error = error;
            });
    }

    handleButtonClick() {
        this.buttonLabel = this._updateChart ? 'Resume' : 'Pause';
        this._updateChart = !this._updateChart;
    }
}

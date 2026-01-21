// TODO: fetch static/data/test_metrics.json and map evaluator outputs into resultsData.
const defaultBins = [0.05,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85,0.95];

const resultsData = {
    validation: {
        accuracy: null,
        macroF1: null,
        microF1: null,
        top5: null,
        ece: null,
        latencyMs: null,
        throughput: null,
        samples: '-/-',
        confusion: {
            labels: [],
            matrix: null
        },
        calibration: {
            bins: defaultBins,
            accuracy: null,
            confidence: null,
            ece: null
        }
    },
    test: {
        accuracy: null,
        macroF1: null,
        microF1: null,
        top5: null,
        ece: null,
        latencyMs: null,
        throughput: null,
        samples: '-/-',
        confusion: {
            labels: [],
            matrix: null
        },
        calibration: {
            bins: defaultBins,
            accuracy: null,
            confidence: null,
            ece: null
        }
    },
    validationBest: {},
    baselines: [
        { name: "Zero-shot CLIP", accuracy: 0.05389496918973604, macroF1: 0.04742928628000638 },
        { name: "Linear-probe CLIP", accuracy: 0, macroF1: 0, comingSoon: true },
        { name: "Fine-tuned (Ours)", accuracy: 0, macroF1: 0 }
    ]
    // optional:
    // ood: { dataset: { name: "Kaggle ASL Alphabet", split: "test", isOOD: true }, test: {...} }
};

function formatPercent(value) {
    if (typeof value !== 'number') return '0.00';
    return (value * 100).toFixed(2) + '%';
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

function renderBaselineChart(baselines) {
    const container = document.getElementById('baseline-chart-rows');
    if (!container) return;
    container.innerHTML = '';

    const makeBar = (className, value) => {
        const wrap = document.createElement('div');
        wrap.className = 'bar-wrap';

        const bar = document.createElement('div');
        bar.className = `bar ${className}`;
        const pct = Math.max(0, Math.min(100, (value * 100)));
        bar.style.setProperty('--bar-width', pct.toFixed(1) + '%');
        bar.style.width = bar.style.getPropertyValue('--bar-width');
        bar.style.opacity = '1';

        const val = document.createElement('span');
        val.className = 'bar-value-label';
        val.textContent = formatPercent(value);

        wrap.appendChild(bar);
        wrap.appendChild(val);
        return wrap;
    };

    baselines.forEach((baseline) => {
        const row = document.createElement('div');
        row.className = 'bar-row';

        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = baseline.name;

        const bars = document.createElement('div');
        bars.className = 'bar-values';

        const isComingSoon = baseline.comingSoon || baseline.name.toLowerCase().includes('coming soon');
        if (isComingSoon) {
            const soon = document.createElement('div');
            soon.className = 'bar-coming-soon';
            soon.textContent = '(coming soon)';
            bars.appendChild(soon);
        } else {
            bars.appendChild(makeBar('bar-acc', baseline.accuracy || 0));
            bars.appendChild(makeBar('bar-f1', baseline.macroF1 || 0));
        }

        row.appendChild(label);
        row.appendChild(bars);
        container.appendChild(row);
    });
}

function createPlaceholderMatrix(size) {
    return Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => (row === col ? 1 : 0))
    );
}

function createCalibrationFallback(bins) {
    const series = bins.map((bin) => Math.max(0, Math.min(1, bin)));
    return { accuracy: series, confidence: series };
}

function setupCanvasSize(canvas, height = 320) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
}

function drawConfusionMatrix(canvas, labels, matrix, progress, highlight) {
    const ctx = setupCanvasSize(canvas, 360);
    if (!ctx) return;
    const width = canvas.clientWidth;
    const height = 360;
    const padding = 56;
    const gridSize = Math.min(width - padding * 2, height - padding * 2);
    const cellSize = gridSize / labels.length;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'transparent';

    const maxVal = Math.max(...matrix.flat(), 1);

    for (let i = 0; i < labels.length; i++) {
        for (let j = 0; j < labels.length; j++) {
            const value = matrix[i][j] * progress;
            const alpha = Math.min(value / maxVal, 1);
            ctx.fillStyle = `rgba(90, 164, 255, ${0.12 + alpha * 0.78})`;
            const x = padding + j * cellSize;
            const y = padding + i * cellSize;
            ctx.fillRect(x, y, cellSize - 2, cellSize - 2);
        }
    }

    if (highlight) {
        const hx = padding + highlight.col * cellSize;
        const hy = padding + highlight.row * cellSize;
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx, hy, cellSize - 2, cellSize - 2);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding - 1, padding - 1, gridSize + 2, gridSize + 2);

    ctx.fillStyle = 'rgba(226,232,240,0.9)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const step = labels.length > 24 ? 3 : (labels.length > 14 ? 2 : 1);
    labels.forEach((label, idx) => {
        if (idx % step !== 0) return;
        const x = padding + idx * cellSize + cellSize / 2;
        ctx.fillText(label, x, padding - 18);
        ctx.fillText(label, padding - 18, padding + idx * cellSize + cellSize / 2);
    });

    ctx.fillStyle = 'rgba(226,232,240,0.6)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Predicted', padding + gridSize / 2, height - 16);
    ctx.save();
    ctx.translate(16, padding + gridSize / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('True', 0, 0);
    ctx.restore();
}

function drawCalibrationCurve(canvas, bins, accuracy, confidence, progress, highlightIndex) {
    const ctx = setupCanvasSize(canvas, 280);
    if (!ctx) return;
    const width = canvas.clientWidth;
    const height = 280;
    const padding = 32;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, plotW, plotH);

    ctx.strokeStyle = 'rgba(59,130,246,0.4)'; // blue line for perfect calibration (legend)
    ctx.beginPath();
    ctx.moveTo(padding, padding + plotH);
    ctx.lineTo(padding + plotW, padding);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'; // red line for measured calibration (legend)
    ctx.lineWidth = 2;
    ctx.beginPath();
    bins.forEach((bin, idx) => {
        const t = idx / (bins.length - 1);
        if (t > progress) return;
        const x = padding + bin * plotW;
        const y = padding + (1 - accuracy[idx]) * plotH;
        if (idx === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    if (typeof highlightIndex === 'number') {
        const x = padding + bins[highlightIndex] * plotW;
        const y = padding + (1 - accuracy[highlightIndex]) * plotH;
        ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = 'rgba(226,232,240,0.5)';
    ctx.fillText('Confidence', padding + plotW / 2, height - 6);
    ctx.save();
    ctx.translate(12, padding + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Accuracy', 0, 0);
    ctx.restore();

    ctx.fillStyle = 'rgba(226,232,240,0.8)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('0.0', padding, padding + plotH + 14);
    ctx.fillText('1.0', padding + plotW - 12, padding + plotH + 14);
    ctx.fillText('1.0', padding - 18, padding + 4);
}

function attachConfusionHover(canvas, tooltip, data) {
    if (!canvas || !tooltip) return;
    const labels = data.confusion.labels;
    const matrix = Array.isArray(data.confusion.matrix)
        ? data.confusion.matrix
        : createPlaceholderMatrix(labels.length);

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const padding = 56;
        const gridSize = Math.min(rect.width - padding * 2, 360 - padding * 2);
        const cellSize = gridSize / labels.length;
        const col = Math.floor((x - padding) / cellSize);
        const row = Math.floor((y - padding) / cellSize);

        if (col >= 0 && row >= 0 && col < labels.length && row < labels.length) {
            const value = matrix[row][col];
            tooltip.textContent = `${labels[row]} → ${labels[col]}: ${value}`;
            tooltip.style.transform = `translate(${x + 12}px, ${y - 8}px)`;
            tooltip.classList.add('is-visible');
            drawConfusionMatrix(canvas, labels, matrix, 1, { row, col });
        } else {
            tooltip.classList.remove('is-visible');
            drawConfusionMatrix(canvas, labels, matrix, 1);
        }
    });

    canvas.addEventListener('mouseleave', () => {
        tooltip.classList.remove('is-visible');
        drawConfusionMatrix(canvas, labels, matrix, 1);
    });
}

function attachCalibrationHover(canvas, tooltip, data) {
    if (!canvas || !tooltip) return;
    const bins = data.calibration.bins;
    const fallback = createCalibrationFallback(bins);
    const accuracy = Array.isArray(data.calibration.accuracy) ? data.calibration.accuracy : fallback.accuracy;
    const confidence = Array.isArray(data.calibration.confidence) ? data.calibration.confidence : fallback.confidence;

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const padding = 32;
        const plotW = rect.width - padding * 2;
        const ratio = Math.max(0, Math.min(1, (x - padding) / plotW));
        const idx = Math.round(ratio * (bins.length - 1));

        if (idx >= 0 && idx < bins.length) {
            tooltip.textContent = `bin ${bins[idx].toFixed(2)} | acc ${accuracy[idx].toFixed(2)} | conf ${confidence[idx].toFixed(2)}`;
            tooltip.style.transform = `translate(${x + 12}px, 12px)`;
            tooltip.classList.add('is-visible');
            drawCalibrationCurve(canvas, bins, accuracy, confidence, 1, idx);
        } else {
            tooltip.classList.remove('is-visible');
            drawCalibrationCurve(canvas, bins, accuracy, confidence, 1);
        }
    });

    canvas.addEventListener('mouseleave', () => {
        tooltip.classList.remove('is-visible');
        drawCalibrationCurve(canvas, bins, accuracy, confidence, 1);
    });
}

function formatEce(value) {
    if (typeof value !== 'number') return '0.000';
    return value.toFixed(3);
}

function formatLatency(value) {
    if (typeof value !== 'number') return '0.0';
    return value.toFixed(1);
}

function formatThroughput(value) {
    if (typeof value !== 'number') return '0.0';
    return value.toFixed(1);
}

function renderResults(data) {
    if (!data) return;

    const val = data.validation || {};
    const tst = data.test || {};

    setText('metric-validate-top1', formatPercent(val.accuracy));
    setText('macro-validate-f1', formatPercent(val.macroF1));
    setText('micro-validate-f1', formatPercent(val.microF1 ?? val.accuracy ?? 0));
    setText('metric-validate-top5', formatPercent(val.top5));
    setText('metric-validate-ece', formatEce(val.ece));

    setText('metric-test-top1', formatPercent(tst.accuracy));
    setText('macro-test-f1', formatPercent(tst.macroF1));
    setText('micro-test-f1', formatPercent(tst.microF1 ?? tst.accuracy ?? 0));
    setText('metric-test-top5', formatPercent(tst.top5));
    setText('metric-test-ece', formatEce(tst.ece));

    const valThroughput = val.latencyMs && val.latencyMs > 0
        ? formatLatency(val.latencyMs)
        : formatThroughput(val.throughput);
    const testThroughput = tst.latencyMs && tst.latencyMs > 0
        ? formatLatency(tst.latencyMs)
        : formatThroughput(tst.throughput);

    setText('metric-validate-throughput', valThroughput);
    setText('metric-test-throughput', testThroughput);

    setText('metric-validate-samples', val.samples || '-/-');
    setText('metric-test-samples', tst.samples || '-/-');

    renderBaselineChart(data.baselines || []);

    if (data.validationBest && typeof data.validationBest === 'object') {
        if (data.validationBest.accuracy !== undefined) setText('val-acc', formatPercent(data.validationBest.accuracy));
        if (data.validationBest.macroF1 !== undefined) setText('val-f1', formatPercent(data.validationBest.macroF1));
        if (data.validationBest.epoch !== undefined) setText('val-epoch', data.validationBest.epoch.toString());
        if (data.validationBest.loss !== undefined) setText('val-loss', Number(data.validationBest.loss).toFixed(5));
        if (data.validationBest.throughput !== undefined) setText('val-throughput', `${Number(data.validationBest.throughput).toFixed(2)} samples/sec`);
        if (data.validationBest.samples !== undefined) setText('val-samples', data.validationBest.samples);
        if (data.validationBest.classes !== undefined) setText('val-classes', data.validationBest.classes.toString());
    }
    setText('test-acc', formatPercent(tst.accuracy));
    setText('test-f1', formatPercent(tst.macroF1));

    const pairs = document.getElementById('confusion-pairs');
    if (pairs && data.confusion && data.confusion.mostConfusedPairs) {
        pairs.innerHTML = '';
        data.confusion.mostConfusedPairs.forEach((pair) => {
            const item = document.createElement('li');
            item.textContent = pair.join(' vs ');
            pairs.appendChild(item);
        });
    }
    const oodSection = document.getElementById('ood-results');
    if (oodSection && data.ood) {
        oodSection.style.display = 'block';
        setText('ood-acc', formatPercent(data.ood.test.accuracy));
        setText('ood-top5', formatPercent(data.ood.test.top5));
        setText('ood-f1', formatPercent(data.ood.test.macroF1));
        setText('ood-ece', formatEce(data.ood.test.ece));
    } else if (oodSection) {
        oodSection.style.display = 'none';
    }
}

function renderConfusionAndCalibration(data) {

    const val = data.validation || {};
    const tst = data.test || {};

    const valConf = val.confusion || {};
    const testConf = tst.confusion || {};
    const defaultLabels = ["A","B","C","D","E","F","G","H"];
    const valLabels = Array.isArray(valConf.labels) && valConf.labels.length ? valConf.labels : defaultLabels;
    const testLabels = Array.isArray(testConf.labels) && testConf.labels.length ? testConf.labels : defaultLabels;
    const valMatrixProvided = Array.isArray(valConf.matrix);
    const testMatrixProvided = Array.isArray(testConf.matrix);
    const valMatrix = valMatrixProvided ? valConf.matrix : null;
    const testMatrix = testMatrixProvided ? testConf.matrix : null;

    const valCal = val.calibration || {};
    const testCal = tst.calibration || {};
    const valBins = Array.isArray(valCal.bins) && valCal.bins.length ? valCal.bins : defaultBins;
    const testBins = Array.isArray(testCal.bins) && testCal.bins.length ? testCal.bins : defaultBins;
    const valAccProvided = Array.isArray(valCal.accuracy);
    const valConfProvided = Array.isArray(valCal.confidence);
    const testAccProvided = Array.isArray(testCal.accuracy);
    const testConfProvided = Array.isArray(testCal.confidence);
    const valAcc = valAccProvided ? valCal.accuracy : null;
    const valConfArr = valConfProvided ? valCal.confidence : null;
    const testAcc = testAccProvided ? testCal.accuracy : null;
    const testConfArr = testConfProvided ? testCal.confidence : null;

    const confusionTargets = [
        { canvas: document.getElementById('confusion-canvas'), tooltip: document.getElementById('confusion-tooltip'), labels: valLabels, matrix: valMatrix },
        { canvas: document.getElementById('confusion-test-canvas'), tooltip: document.getElementById('confusion-test-tooltip'), labels: testLabels, matrix: testMatrix }
    ];
    confusionTargets.forEach(({ canvas, tooltip, labels, matrix }) => {
        if (!canvas || !matrix) return;
        drawConfusionMatrix(canvas, labels, matrix, 1);
        if (!canvas.dataset.hoverBound) {
            attachConfusionHover(canvas, tooltip, { confusion: { labels, matrix } });
            canvas.dataset.hoverBound = 'true';
        }
    });

    const calibrationTargets = [
        { canvas: document.getElementById('calibration-canvas'), tooltip: document.getElementById('calibration-tooltip'), bins: valBins, accuracy: valAcc, confidence: valConfArr },
        { canvas: document.getElementById('calibration-test-canvas'), tooltip: document.getElementById('calibration-test-tooltip'), bins: testBins, accuracy: testAcc, confidence: testConfArr }
    ];
    calibrationTargets.forEach(({ canvas, tooltip, bins, accuracy, confidence }) => {
        if (!canvas || !accuracy || !confidence) return;
        drawCalibrationCurve(canvas, bins && bins.length ? bins : defaultBins, accuracy, confidence, 1);
        if (!canvas.dataset.hoverBound) {
            attachCalibrationHover(canvas, tooltip, { calibration: { bins, accuracy, confidence } });
            canvas.dataset.hoverBound = 'true';
        }
    });
}

async function loadResultsFiles(data) {
    const updated = { ...data };
    const toNumber = (value, fallback = 0) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    };

    try {
        const response = await fetch('static/results/test_zero_shot_20260121_055031_dashboard.json');
        if (response.ok) {
            const payload = await response.json();
            const basic = payload.basic_evaluation || {};
            const detailed = payload.detailed_analysis || {};
            const zsAcc = toNumber(basic.accuracy);
            const zsMacro = toNumber(detailed.macro_f1);
            updated.baselines = [
                { name: "Zero-shot CLIP", accuracy: zsAcc, macroF1: zsMacro },
                { name: "Linear-probe CLIP", accuracy: 0, macroF1: 0, comingSoon: true }
            ];
        }
    } catch (err) {
        console.warn('Could not load zero-shot JSON, keeping stub baselines.', err);
    }

    try {
        const response = await fetch('static/results/validate_20260121_050345_dashboard.json');
        if (response.ok) {
            const payload = await response.json();
            const basic = payload.basic_evaluation || {};
            const detailed = payload.detailed_analysis || {};
            const cal = detailed.calibration || {};

            const labels = detailed.per_letter_performance
                ? Object.keys(detailed.per_letter_performance)
                : updated.validation.confusion.labels;
            const matrix = detailed.confusion_matrix_normalized || detailed.confusion_matrix;

            const bins = Array.isArray(cal.bin_confidence) && cal.bin_confidence.length
                ? cal.bin_confidence
                : (Array.isArray(cal.bin_edges) && cal.bin_edges.length > 1
                    ? cal.bin_edges.slice(0, -1).map((start, idx) => (start + cal.bin_edges[idx + 1]) / 2)
                    : defaultBins);
            const valCorrect = toNumber(basic.correct_predictions);
            const valTotal = toNumber(basic.total_predictions);

            updated.validation = {
                accuracy: toNumber(basic.top1_accuracy ?? basic.accuracy, updated.validation.accuracy),
                macroF1: toNumber(detailed.macro_f1, updated.validation.macroF1),
                microF1: toNumber(detailed.micro_f1 ?? basic.accuracy, updated.validation.microF1),
                top5: toNumber(basic.topk_accuracy, updated.validation.top5),
                ece: toNumber(cal.ece, updated.validation.ece),
                latencyMs: null,
                throughput: toNumber(basic.samples_per_second, updated.validation.throughput),
                samples: `${valCorrect || 0}/${valTotal || 0}`,
                confusion: {
                    labels,
                    matrix: Array.isArray(matrix) ? matrix : null
                },
                calibration: {
                    bins,
                    accuracy: Array.isArray(cal.bin_accuracy) ? cal.bin_accuracy : null,
                    confidence: Array.isArray(cal.bin_confidence) ? cal.bin_confidence : null,
                    ece: typeof cal.ece === 'number' ? cal.ece : updated.validation.calibration.ece
                }
                ,
                isOOD: false
            };
        }
    } catch (err) {
        console.warn('Could not load validation JSON, keeping stub data.', err);
    }

    try {
        const response = await fetch('static/results/test_20260121_021542_dashboard.json');
        if (response.ok) {
            const payload = await response.json();
            const basic = payload.basic_evaluation || {};
            const detailed = payload.detailed_analysis || {};
            const cal = detailed.calibration || {};

            const labels = detailed.per_letter_performance
                ? Object.keys(detailed.per_letter_performance)
                : updated.test.confusion.labels;
            const matrix = detailed.confusion_matrix_normalized || detailed.confusion_matrix;

            const bins = Array.isArray(cal.bin_confidence) && cal.bin_confidence.length
                ? cal.bin_confidence
                : (Array.isArray(cal.bin_edges) && cal.bin_edges.length > 1
                    ? cal.bin_edges.slice(0, -1).map((start, idx) => (start + cal.bin_edges[idx + 1]) / 2)
                    : defaultBins);

            updated.test = {
                accuracy: toNumber(basic.top1_accuracy ?? basic.accuracy, updated.test.accuracy),
                macroF1: toNumber(detailed.macro_f1, updated.test.macroF1),
                microF1: toNumber(detailed.micro_f1 ?? basic.accuracy, updated.test.microF1),
                top5: toNumber(basic.topk_accuracy, updated.test.top5),
                ece: toNumber(cal.ece, updated.test.ece),
                latencyMs: null,
                throughput: toNumber(basic.samples_per_second, updated.test.throughput),
                samples: `${basic.correct_predictions ?? 0}/${basic.total_predictions ?? 0}`,
                confusion: {
                    labels,
                    matrix: Array.isArray(matrix) ? matrix : null
                },
                calibration: {
                    bins,
                    accuracy: Array.isArray(cal.bin_accuracy) ? cal.bin_accuracy : null,
                    confidence: Array.isArray(cal.bin_confidence) ? cal.bin_confidence : null,
                    ece: typeof cal.ece === 'number' ? cal.ece : updated.test.calibration.ece
                },
                isOOD: true
            };

            const zeroShot = (updated.baselines || []).find((b) => b.name.toLowerCase().includes('zero-shot')) || { name: "Zero-shot CLIP", accuracy: 0, macroF1: 0 };
            updated.baselines = [
                zeroShot,
                { name: "Fine tuned", accuracy: updated.test.accuracy ?? 0, macroF1: updated.test.macroF1 ?? 0 },
                { name: "Linear-probe CLIP", accuracy: 0, macroF1: 0, comingSoon: true }
            ];
        }
    } catch (err) {
        console.warn('Could not load test JSON, keeping stub data.', err);
    }

    return updated;
}


// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

$(document).ready(function() {
    renderResults(resultsData);

    renderConfusionAndCalibration(resultsData);
    loadResultsFiles(resultsData).then((merged) => {
        renderResults(merged);
        renderConfusionAndCalibration(merged);
    });
})

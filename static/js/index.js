// TODO: fetch static/data/test_metrics.json and map evaluator outputs into resultsData.
const resultsData = {
    test: { accuracy: 0.00, macroF1: 0.00, top5: 0.00, ece: 0.00, latencyMs: 0.0, throughput: 0.0 },
    dataset: { name: "HF ASL Dataset", split: "test", isOOD: false },
    validationBest: {
        epoch: 9,
        accuracy: 0.98697,
        macroF1: 0.98698,
        loss: 0.04477,
        throughput: 10.56,
        samples: "844",
        classes: 24
    },
    baselines: [
        { name: "Zero-shot CLIP", accuracy: 0.00, macroF1: 0.00 },
        { name: "Linear-probe CLIP", accuracy: 0.00, macroF1: 0.00 },
        { name: "Fine-tuned (Ours)", accuracy: 0.00, macroF1: 0.00 }
    ],
    confusion: {
        labels: ["A","B","C","D","E","F","G","H"],
        matrix: null,
        mostConfusedPairs: [["O","P"],["M","N"]]
    },
    calibration: {
        bins: [0.05,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85,0.95],
        accuracy: null,
        confidence: null,
        ece: 0.00637
    }
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

    baselines.forEach((baseline) => {
        const row = document.createElement('div');
        row.className = 'bar-row';

        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = baseline.name;

        const bars = document.createElement('div');
        bars.className = 'bar-values';

        const accBar = document.createElement('div');
        accBar.className = 'bar bar-acc';
        accBar.style.setProperty('--bar-width', (baseline.accuracy * 100).toFixed(1) + '%');
        accBar.style.width = accBar.style.getPropertyValue('--bar-width');
        accBar.style.opacity = '1';
        accBar.textContent = formatPercent(baseline.accuracy);

        const f1Bar = document.createElement('div');
        f1Bar.className = 'bar bar-f1';
        f1Bar.style.setProperty('--bar-width', (baseline.macroF1 * 100).toFixed(1) + '%');
        f1Bar.style.width = f1Bar.style.getPropertyValue('--bar-width');
        f1Bar.style.opacity = '1';
        f1Bar.textContent = formatPercent(baseline.macroF1);

        bars.appendChild(accBar);
        bars.appendChild(f1Bar);

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

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, plotW, plotH);

    ctx.strokeStyle = 'rgba(226,232,240,0.35)';
    ctx.beginPath();
    ctx.moveTo(padding, padding + plotH);
    ctx.lineTo(padding + plotW, padding);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(90, 164, 255, 0.95)';
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

    setText('metric-test-acc', formatPercent(data.test.accuracy));
    setText('metric-test-f1', formatPercent(data.test.macroF1));
    setText('metric-test-top5', formatPercent(data.test.top5));
    setText('metric-test-ece', formatEce(data.test.ece));

    if (data.test.latencyMs && data.test.latencyMs > 0) {
        setText('metric-throughput', formatLatency(data.test.latencyMs));
        setText('metric-throughput-label', 'Latency (ms/img)');
    } else {
        setText('metric-throughput', formatThroughput(data.test.throughput));
        setText('metric-throughput-label', 'Throughput (img/s)');
    }

    setText('metric-dataset', data.dataset.name);
    setText('dataset-badge', data.dataset.isOOD ? 'OOD Test' : 'In-dataset Test');

    renderBaselineChart(data.baselines || []);

    setText('val-acc', formatPercent(data.validationBest.accuracy));
    setText('val-f1', formatPercent(data.validationBest.macroF1));
    setText('val-epoch', data.validationBest.epoch.toString());
    setText('val-loss', data.validationBest.loss.toFixed(5));
    setText('val-throughput', `${data.validationBest.throughput.toFixed(2)} samples/sec`);
    setText('val-samples', data.validationBest.samples);
    setText('val-classes', data.validationBest.classes.toString());
    setText('test-acc', formatPercent(data.test.accuracy));
    setText('test-f1', formatPercent(data.test.macroF1));

    const pairs = document.getElementById('confusion-pairs');
    if (pairs && data.confusion && data.confusion.mostConfusedPairs) {
        pairs.innerHTML = '';
        data.confusion.mostConfusedPairs.forEach((pair) => {
            const item = document.createElement('li');
            item.textContent = pair.join(' vs ');
            pairs.appendChild(item);
        });
    }
    setText('calibration-ece', formatEce(data.calibration.ece));

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
    const matrix = Array.isArray(data.confusion.matrix)
        ? data.confusion.matrix
        : createPlaceholderMatrix(data.confusion.labels.length);
    const bins = data.calibration.bins;
    const fallback = createCalibrationFallback(bins);
    const accuracy = Array.isArray(data.calibration.accuracy) ? data.calibration.accuracy : fallback.accuracy;
    const confidence = Array.isArray(data.calibration.confidence) ? data.calibration.confidence : fallback.confidence;

    const confusionCanvas = document.getElementById('confusion-canvas');
    const calibrationCanvas = document.getElementById('calibration-canvas');
    const confusionTooltip = document.getElementById('confusion-tooltip');
    const calibrationTooltip = document.getElementById('calibration-tooltip');

    drawConfusionMatrix(confusionCanvas, data.confusion.labels, matrix, 1);
    drawCalibrationCurve(calibrationCanvas, bins, accuracy, confidence, 1);

    if (!confusionCanvas.dataset.hoverBound) {
        attachConfusionHover(confusionCanvas, confusionTooltip, data);
        confusionCanvas.dataset.hoverBound = 'true';
    }
    if (!calibrationCanvas.dataset.hoverBound) {
        attachCalibrationHover(calibrationCanvas, calibrationTooltip, data);
        calibrationCanvas.dataset.hoverBound = 'true';
    }
}

async function loadResultsFiles(data) {
    const updates = {};

    try {
        const response = await fetch('static/results/validation_epoch_9_confusion_matrix.json');
        if (response.ok) {
            const payload = await response.json();
            updates.confusion = {
                labels: payload.labels || data.confusion.labels,
                matrix: payload.matrix || data.confusion.matrix,
                mostConfusedPairs: data.confusion.mostConfusedPairs
            };
        }
    } catch (err) {
        console.warn('Confusion matrix JSON unavailable, using stub data.', err);
    }

    try {
        const response = await fetch('static/results/validation_epoch_9_ece.json');
        if (response.ok) {
            const payload = await response.json();
            updates.calibration = {
                bins: payload.bins || data.calibration.bins,
                accuracy: payload.accuracy || data.calibration.accuracy,
                confidence: payload.confidence || data.calibration.confidence,
                ece: typeof payload.ece === 'number' ? payload.ece : data.calibration.ece
            };
        }
    } catch (err) {
        console.warn('Calibration JSON unavailable, using stub data.', err);
    }

    return {
        ...data,
        ...updates,
        confusion: updates.confusion || data.confusion,
        calibration: updates.calibration || data.calibration
    };
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

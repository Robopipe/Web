## What AI quality inspection is

AI quality inspection is visual inspection where a deep-learning model makes the call. The model learns from labelled images what a good piece looks like and what defects look like. It then judges every next piece that passes under the camera.

## How it differs from rule-based machine vision

Classic machine vision works with rules. Someone sets where to look for an edge, which shade a colour must have or how large a spot may be. That works for rigid parts that look the same every time.

A sandwich, a baguette or a hand-packed pack looks a little different every time. So an AI model does not learn rules, it learns from examples. When the product or an ingredient supplier changes, you add new images and retrain the model. You do not rewrite rules.

## How Robopipe learns from your samples

1. **Capture** a set of images on the line.
2. **Label** them in the Studio app. For classification you sort thumbnails into OK and NOK. For detection you draw boxes around defects.
3. **Train** the model. Training runs on the controller or on your own infrastructure.
4. **Inspect.** In production the model judges every piece within 50 ms, right at the line.

A wizard guides you from start to finish and you do not need to know machine learning. You decide what passes. Everything is versioned: datasets, annotations, configurations and model weights. You roll back to the previous model with one click.

[Auto annotation](/en/auto-annotation) speeds up labelling. Robopipe Vision proposes the boxes and you only review them.

## What it brought customers

- **Crocodille** deployed Robopipe on three sandwich lines and cut its reject rate by roughly a third in the first month. We showed the team how to label one product. They added every product since themselves.
- **Wolfberry** counts the capsules in every jar with 99.5% precision.
- **MG Servis** checks every pack with 95% detection precision.

## Camera and model belong together

A model needs good images. The [camera quality inspection](/en/camera-quality-inspection) page shows the camera on the line. For the wider picture, see [machine vision](/en/machine-vision) and [computer vision](/en/computer-vision).

---
title: Automatic data annotation: how Robopipe Vision labels images for you
slug: automatic-data-annotation
excerpt: Labelling images is the most laborious part of preparing a model. Robopipe Studio can now propose the boxes itself. A person reviews, edits and approves them.
seoTitle: Automatic data annotation for model training | Robopipe
seoDescription: How auto annotation works in Robopipe Studio: label descriptions, boxes proposed by Robopipe Vision, review and approval by a person.
---
Every quality inspection model starts with labelled images. For detection, that means drawing a box around every defect, every ingredient or every capsule. On dozens of images it is tedious. On hundreds it is a week of work.

Since the release of 30 October 2026, the Robopipe Studio app has auto annotation. Robopipe Vision proposes the boxes. A person reviews, edits and approves them.

## It starts with a label description

Robopipe Vision finds objects from how you describe them. In the Auto-annotate settings, write one or two sentences per label about how to recognise it and what sets it apart from the other labels. Labels without a description are skipped.

You do not have to write the description from scratch. The Generate button writes one from an example you have already labelled. The text goes into the field as a draft and is saved only when you confirm it.

## Boxes appear live

The "Auto-annotate with Robopipe Vision" button in the toolbar annotates the current image. Boxes appear one by one as Robopipe Vision finds them. Busy scenes can take a few minutes. The result is kept even if you leave the page.

You run several images at once from the data source list. Select the images and auto-annotate the selection. They run in parallel, and images that are already annotated are skipped.

## A person has the final say

Proposals are not saved as finished annotations. They wait for review. You edit or delete individual boxes and save them with Approve.

> Auto annotation draws boxes today, which means object detection.

## Feedback that sticks

When a proposal is off, tell Robopipe Vision what went wrong. It runs again and returns a corrected set of boxes. If your comment applies to the whole project, Robopipe Vision saves it as a project note. You can exclude the note. Saved notes go with every later run.

## Good to know

You can use an offline model for auto annotation. Alternatively, Robopipe can deploy the whole solution at your site (on-premise). Auto annotation is part of the [Pro and Enterprise](/en/pricing) plans. The open-source edition and the Standard plan do not include it.

The [auto annotation](/en/auto-annotation) page has the full description. The [camera quality inspection](/en/camera-quality-inspection) page shows how labelled images become inspection on the line.

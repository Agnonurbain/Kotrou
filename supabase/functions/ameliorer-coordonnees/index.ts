import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const NB_TRACES_REQUIS = 3
const TOLERANCE_HAUSDORFF_M = 150

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  let ligne_id: string
  try {
    const body = await req.json()
    ligne_id = body.ligne_id
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!ligne_id) {
    return new Response('ligne_id requis', { status: 400 })
  }

  const { data: traces } = await supabase
    .from('traces_gps')
    .select('id, trace, nb_points, precision_moyenne')
    .eq('ligne_id', ligne_id)
    .eq('statut', 'en_attente')
    .gte('nb_points', 8)
    .order('precision_moyenne', { ascending: true })

  if (!traces || traces.length < NB_TRACES_REQUIS) {
    return Response.json({
      action: 'attente',
      message: `${traces?.length ?? 0}/${NB_TRACES_REQUIS} traces necessaires`,
    })
  }

  // Check concordance between the two best traces
  const { data: concordance } = await supabase.rpc('traces_concordantes', {
    trace_a: traces[0].trace,
    trace_b: traces[1].trace,
    tolerance_m: TOLERANCE_HAUSDORFF_M,
  })

  if (!concordance) {
    await supabase
      .from('traces_gps')
      .update({ statut: 'rejete' })
      .in('id', traces.slice(0, 2).map((t: { id: string }) => t.id))

    return Response.json({
      action: 'rejete',
      message: 'Traces trop differentes — rejet automatique',
    })
  }

  // Calculate consensus trace
  const { data: traceConsensus } = await supabase
    .rpc('calculer_consensus_trace', { p_ligne_id: ligne_id })

  if (!traceConsensus) {
    return new Response('Erreur calcul consensus', { status: 500 })
  }

  // Extract start and end points
  const { data: extremites } = await supabase.rpc('extraire_extremites_linestring', {
    linestring: traceConsensus,
  })

  if (!extremites || extremites.length === 0) {
    return new Response('Erreur extraction extremites', { status: 500 })
  }

  const { debut, fin } = extremites[0]

  // Update the line with precise GPS coordinates
  const { error: errUpdate } = await supabase
    .from('lignes')
    .update({
      depart_coords: debut,
      arrivee_coords: fin,
      trajet_line: traceConsensus,
      coords_precision: 'trace_gps',
    })
    .eq('id', ligne_id)

  if (errUpdate) {
    return Response.json({ action: 'erreur', message: errUpdate.message }, { status: 500 })
  }

  // Boost confidence to at least 5 if currently lower
  await supabase.rpc('boost_confiance_ligne', { p_ligne_id: ligne_id, p_min: 5 }).catch(() => {
    // Non-critical — ignore if the RPC doesn't exist yet
  })

  // Mark traces as processed
  await supabase
    .from('traces_gps')
    .update({ statut: 'traite', traite_at: new Date().toISOString() })
    .in('id', traces.map((t: { id: string }) => t.id))

  return Response.json({
    action: 'ameliore',
    ligne_id,
    nb_traces: traces.length,
    coords_precision: 'trace_gps',
  })
})

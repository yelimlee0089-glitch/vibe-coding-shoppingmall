import styles from './AuthForm.module.css'

function FormField({ id, label, error, optional, action, ...inputProps }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {optional && <span className={styles.optional}> (선택)</span>}
      </label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          name={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        {action}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}

export default FormField
